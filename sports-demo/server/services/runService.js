import crypto from 'node:crypto';
import { HttpError, assert } from '../errors.js';

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff]);

function decodeBase64Strict(raw) {
  assert(typeof raw === 'string' && raw.trim().length > 0, 400, 'IMAGE_REQUIRED', '请上传跑步截图');

  let text = raw.trim();
  const dataUrl = /^data:image\/(?:png|jpe?g);base64,([\s\S]+)$/i.exec(text);
  if (dataUrl) text = dataUrl[1];
  text = text.replace(/\s+/g, '');

  assert(
    /^[A-Za-z0-9+/]+={0,2}$/.test(text) && text.length % 4 === 0,
    400,
    'IMAGE_ENCODING_INVALID',
    '图片内容不是有效的 base64 编码',
  );

  const bytes = Buffer.from(text, 'base64');
  assert(bytes.length > 0, 400, 'IMAGE_REQUIRED', '图片内容为空');
  return bytes;
}

function detectImageMime(bytes) {
  if (bytes.length >= PNG_MAGIC.length && bytes.subarray(0, PNG_MAGIC.length).equals(PNG_MAGIC)) {
    return 'image/png';
  }
  if (bytes.length >= JPEG_MAGIC.length && bytes.subarray(0, JPEG_MAGIC.length).equals(JPEG_MAGIC)) {
    return 'image/jpeg';
  }
  return null;
}

function validateMetrics(body) {
  const distanceKm = body?.distanceKm;
  const minutes = body?.minutes;

  assert(
    typeof distanceKm === 'number' && Number.isFinite(distanceKm) && distanceKm > 0,
    400,
    'DISTANCE_INVALID',
    '模拟距离必须是大于 0 的有限数字（单位：公里）',
  );
  assert(
    typeof minutes === 'number' && Number.isFinite(minutes) && minutes > 0,
    400,
    'MINUTES_INVALID',
    '模拟时长必须是大于 0 的有限数字（单位：分钟）',
  );

  return { distanceKm, minutes };
}

export function createRunService({ repo, clock, analyzer, config }) {
  async function checkIn(user, body) {
    const metrics = validateMetrics(body);
    const bytes = decodeBase64Strict(body?.imageBase64);

    assert(
      bytes.length <= config.maxImageBytes,
      413,
      'IMAGE_TOO_LARGE',
      `图片解码后不能超过 ${Math.floor(config.maxImageBytes / 1024 / 1024)}MB`,
    );

    const mime = detectImageMime(bytes);
    assert(
      mime !== null,
      400,
      'IMAGE_TYPE_INVALID',
      '文件内容不是有效的 PNG 或 JPEG（仅改扩展名不算）',
    );

    const day = clock.today();

    const sameDay = repo.getRunByUserDay(user.id, day);
    if (sameDay) {
      throw new HttpError(
        409,
        'RUN_ALREADY_CHECKED_IN',
        '今天已经完成一次跑步打卡（演示默认每天一次，可用新图片也不行）',
      );
    }

    const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
    // 演示默认：全局比对所有已提交图片字节，阻止同一张图跨人、跨天复用。
    const duplicate = repo.findRunBySha(sha256);
    if (duplicate) {
      throw new HttpError(
        409,
        'IMAGE_ALREADY_USED',
        `这张截图已被使用过（${duplicate.day}，${duplicate.userName}），同一字节内容不能重复打卡`,
        { duplicateDay: duplicate.day },
      );
    }

    const analysis = await analyzer.analyze({
      bytes,
      mime,
      filename: typeof body?.filename === 'string' ? body.filename.slice(0, 120) : 'screenshot',
      submitted: metrics,
    });

    const run = {
      id: crypto.randomUUID(),
      userId: user.id,
      userName: user.name,
      teamId: user.teamId,
      day,
      distanceKm: metrics.distanceKm,
      minutes: metrics.minutes,
      sha256,
      imageBytes: bytes.length,
      mime,
      analysis,
      createdAt: new Date(clock.now()).toISOString(),
    };
    // 分析器是异步的，等待期间可能有并发请求插入同一天/同一图片；
    // 这里在插入前做同步最终校验，检查与写入之间没有 await（内存实现内为原子操作）。
    const inserted = repo.tryInsertRun(run);
    if (!inserted.ok) {
      if (inserted.reason === 'DAY') {
        throw new HttpError(
          409,
          'RUN_ALREADY_CHECKED_IN',
          '今天已经完成一次跑步打卡（演示默认每天一次，可用新图片也不行）',
        );
      }
      throw new HttpError(
        409,
        'IMAGE_ALREADY_USED',
        `这张截图已被使用过（${inserted.existing.day}，${inserted.existing.userName}），同一字节内容不能重复打卡`,
        { duplicateDay: inserted.existing.day },
      );
    }

    return {
      run: toPublicRun(run),
      day,
      todayRun: toPublicRun(run),
      mock: true,
      validation: {
        label: '演示校验通过（MOCK 模拟识别）',
        realOcr: false,
        checks: [
          '图片内容为真实 PNG/JPEG 字节（校验文件头）',
          '图片解码大小在限制内',
          '已对图片字节计算 SHA256 并在演示范围内去重',
          '距离/时长为模拟输入，经服务端数字校验；图片本身未证明真实跑步',
        ],
      },
    };
  }

  function getTodayRun(userId) {
    const run = repo.getRunByUserDay(userId, clock.today());
    return run ? toPublicRun(run) : null;
  }

  function toPublicRun(run) {
    return {
      id: run.id,
      day: run.day,
      distanceKm: run.distanceKm,
      minutes: run.minutes,
      sha256: run.sha256,
      imageBytes: run.imageBytes,
      mime: run.mime,
      createdAt: run.createdAt,
      mock: true,
      analysisMode: run.analysis?.mode ?? 'mock',
      analysis: run.analysis ?? {
        mode: 'mock',
        mock: true,
        note: 'MOCK：未进行真实 OCR 或图像识别',
      },
    };
  }

  return { checkIn, getTodayRun, toPublicRun };
}

export const imageHelpers = { decodeBase64Strict, detectImageMime };
