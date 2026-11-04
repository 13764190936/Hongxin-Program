const state = {
  meta: null,
  identities: [],
  userId: null,
  metric: 'steps',
  scope: 'personal',
  fileDataUrl: null,
  fileName: '',
  fileSize: 0,
  boards: null,
  busy: false,
};

const $ = (id) => document.getElementById(id);

const els = {
  day: $('current-day'),
  identitySelect: $('identity-select'),
  errorBanner: $('error-banner'),
  errorTitle: $('error-title'),
  errorMessage: $('error-message'),
  noticeBanner: $('notice-banner'),
  noticeText: $('notice-text'),
  profileDay: $('profile-day'),
  profileAvatar: $('profile-avatar'),
  profileName: $('profile-name'),
  profileTeam: $('profile-team'),
  profileSource: $('profile-source'),
  statTodaySteps: $('stat-today-steps'),
  statTotalSteps: $('stat-total-steps'),
  statRun: $('stat-run'),
  statRunNote: $('stat-run-note'),
  stepsInput: $('steps-input'),
  stepsSubmit: $('steps-submit'),
  stepsStatus: $('steps-status'),
  runFile: $('run-file'),
  previewWrap: $('preview-wrap'),
  preview: $('run-preview'),
  fileMeta: $('file-meta'),
  runDistance: $('run-distance'),
  runMinutes: $('run-minutes'),
  runSubmit: $('run-submit'),
  runStatus: $('run-status'),
  runResult: $('run-result'),
  runResultTitle: $('run-result-title'),
  runResultList: $('run-result-list'),
  boardBody: $('board-body'),
  boardMeta: $('board-meta'),
  boardTie: $('board-tie'),
  boardNameHead: $('board-name-head'),
  boardExtraHead: $('board-extra-head'),
  nextDay: $('next-day'),
  resetDemo: $('reset-demo'),
  confirmPanel: $('confirm-panel'),
  confirmText: $('confirm-text'),
  confirmOk: $('confirm-ok'),
  confirmCancel: $('confirm-cancel'),
};

let pendingConfirm = null;

function newIdemKey(prefix) {
  const suffix = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${suffix}`;
}

function formatNumber(value) {
  return Number(value).toLocaleString('zh-CN');
}

async function api(path, { method = 'GET', body, idem } = {}) {
  const headers = {};
  if (state.userId) headers['x-demo-user'] = state.userId;
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (idem) headers['idempotency-key'] = idem;

  let response;
  try {
    response = await fetch(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    const error = new Error('无法连接本地服务，请确认服务仍在运行');
    error.code = 'NETWORK';
    throw error;
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const error = new Error(data?.error?.message || `请求失败（HTTP ${response.status}）`);
    error.code = data?.error?.code || 'HTTP_ERROR';
    error.status = response.status;
    error.details = data?.error?.details;
    throw error;
  }
  return data;
}

function showError(error, title = '操作失败') {
  els.errorTitle.textContent = `${title}${error.code ? `（${error.code}）` : ''}`;
  els.errorMessage.textContent = error.message || String(error);
  els.errorBanner.hidden = false;
  els.noticeBanner.hidden = true;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showNotice(text) {
  els.noticeText.textContent = text;
  els.noticeBanner.hidden = false;
  els.errorBanner.hidden = true;
}

function hideBanners() {
  els.errorBanner.hidden = true;
  els.noticeBanner.hidden = true;
}

// 身份、演示日或重置变化后清理待上传截图/预览/结果，避免把上一个人/上一天的截图带到新状态。
function clearRunDraft() {
  state.fileDataUrl = null;
  state.fileName = '';
  state.fileSize = 0;
  els.runFile.value = '';
  els.fileMeta.textContent = '';
  els.previewWrap.hidden = true;
  els.preview.removeAttribute('src');
  els.runDistance.value = '';
  els.runMinutes.value = '';
}

function clearRunResult() {
  els.runResult.hidden = true;
  els.runResult.classList.remove('is-error');
  els.runResultTitle.textContent = '打卡结果';
  els.runResultList.replaceChildren();
}

function setBusy(busy) {
  state.busy = busy;
  els.stepsSubmit.disabled = busy;
  els.runSubmit.disabled = busy;
  els.identitySelect.disabled = busy;
  els.nextDay.disabled = busy;
  els.resetDemo.disabled = busy;
  if (busy) closeConfirm();
}

// 页面内二次确认：不使用原生 confirm/window.alert，避免阻塞自动化与浏览器对话框。
function openConfirm(message, action) {
  pendingConfirm = action;
  els.confirmText.textContent = message;
  els.confirmPanel.hidden = false;
  els.confirmOk.focus();
}

function closeConfirm() {
  pendingConfirm = null;
  els.confirmPanel.hidden = true;
}

async function confirmPending() {
  const action = pendingConfirm;
  closeConfirm();
  if (!action) return;
  await action();
}

function renderIdentityOptions() {
  els.identitySelect.replaceChildren();
  for (const person of state.identities) {
    const option = document.createElement('option');
    option.value = person.id;
    option.textContent = `${person.name} · ${person.role} · ${person.teamName}`;
    els.identitySelect.append(option);
  }
  els.identitySelect.value = state.userId ?? '';
}

function currentMetricLabel() {
  return state.metric === 'steps' ? '步数' : '跑步距离';
}

function renderMe(me) {
  els.day.textContent = me.day;
  els.profileDay.textContent = `服务端日期 ${me.day}`;
  els.profileAvatar.textContent = me.user.name.slice(0, 1);
  els.profileName.textContent = `${me.user.name}（${me.user.role}）`;
  els.profileTeam.textContent = me.team ? me.team.name : '未分组';
  els.statTodaySteps.textContent = `${formatNumber(me.todaySteps)} 步`;
  els.statTotalSteps.textContent = `${formatNumber(me.totalSteps)} 步`;

  if (me.todayRun) {
    els.statRun.textContent = `${me.todayRun.distanceKm} km`;
    els.statRunNote.textContent = `${me.todayRun.minutes} 分钟 · 已打卡（MOCK）`;
    els.runStatus.textContent = '今日已打卡，每人每天限一次';
  } else {
    els.statRun.textContent = '未打卡';
    els.statRunNote.textContent = '每天限一次 · 可上传截图体验';
    els.runStatus.textContent = '等待上传';
  }

  els.profileSource.textContent = `数据源：模拟微信步数快照（非真实微信）· 服务端日期 ${me.day} · 历史 ${me.history.length} 天快照`;
}

async function loadMe() {
  if (!state.userId) return;
  const me = await api('/api/me');
  renderMe(me);
}

const rankLabel = (rank) => `第 ${rank} 名`;

function renderBoards() {
  const boards = state.boards;
  if (!boards) return;

  const unit = state.metric === 'steps' ? '步' : 'km';
  const isPersonal = state.scope === 'personal';
  els.boardNameHead.textContent = isPersonal ? '姓名' : '团队';
  els.boardExtraHead.textContent = isPersonal ? '团队' : '参与人数';
  els.boardMeta.textContent = `${boards.day} · ${currentMetricLabel()} · 仅统计当日 · 团队聚合：${
    boards.teamAggregation === 'sum' ? '成员求和（演示默认）' : boards.teamAggregation
  }`;
  els.boardTie.textContent = boards.tieRule;

  const rows = isPersonal ? boards.personal : boards.team;
  els.boardBody.replaceChildren();

  if (!rows.length) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 4;
    td.className = 'empty';
    td.textContent = '当前演示日暂无数据。进入“下一天”后旧日榜会清空，可再同步步数或跑步打卡。';
    tr.append(td);
    els.boardBody.append(tr);
    return;
  }

  for (const row of rows) {
    const tr = document.createElement('tr');

    const rank = document.createElement('td');
    const rankSpan = document.createElement('span');
    rankSpan.className = 'rank-medal';
    rankSpan.textContent = rankLabel(row.rank);
    rank.append(rankSpan);

    const name = document.createElement('td');
    if (isPersonal) {
      name.textContent = `${row.name}（${row.teamName}）`;
    } else {
      name.textContent = row.name;
    }

    const value = document.createElement('td');
    value.className = 'col-value';
    value.textContent = state.metric === 'steps' ? `${formatNumber(row.value)} ${unit}` : `${row.value} ${unit}`;

    const extra = document.createElement('td');
    if (isPersonal) {
      extra.textContent = row.teamName;
    } else {
      extra.textContent = `${row.participants} / ${row.memberTotal} 人`;
    }

    tr.append(rank, name, value, extra);
    els.boardBody.append(tr);
  }
}

async function loadBoards() {
  state.boards = await api(`/api/boards?metric=${encodeURIComponent(state.metric)}`);
  renderBoards();
}

async function refreshCore() {
  await loadMe();
  await loadBoards();
}

async function loadMeta() {
  const meta = await api('/api/meta');
  state.meta = meta;
  state.identities = meta.identities;
  if (!state.userId || !meta.identities.some((p) => p.id === state.userId)) {
    state.userId = meta.currentIdentity || meta.identities[0]?.id || null;
  }
  els.day.textContent = meta.day;
  renderIdentityOptions();
}

async function submitSteps() {
  if (state.busy) return;
  const raw = els.stepsInput.value.trim();
  if (!/^\d+$/.test(raw)) {
    showError({ code: 'STEPS_INVALID', message: '请输入大于等于 0 的整数步数（模拟快照）' }, '步数无效');
    return;
  }
  const steps = Number(raw);
  if (!Number.isSafeInteger(steps)) {
    showError({ code: 'STEPS_INVALID', message: '步数超出可处理范围' }, '步数无效');
    return;
  }

  setBusy(true);
  els.stepsStatus.textContent = '提交中…';
  try {
    const result = await api('/api/steps/mock-sync', {
      method: 'POST',
      idem: newIdemKey('steps'),
      body: { steps },
    });
    const replay = result.replayed ? '（该请求已幂等重试，返回原结果）' : '';
    els.stepsStatus.textContent = `已记录 ${formatNumber(result.todaySteps)} 步 · ${result.day}`;
    showNotice(
      `模拟步数已按“当日绝对快照”保存：本次 ${formatNumber(steps)} 步，今日为 ${formatNumber(
        result.todaySteps,
      )} 步（6000→8000 会得到 8000，不会累加），历史总步数 ${formatNumber(result.totalSteps)} 步。${replay}`,
    );
    await refreshCore();
  } catch (error) {
    els.stepsStatus.textContent = '提交失败';
    showError(error, '同步模拟步数失败');
  } finally {
    setBusy(false);
  }
}

function renderRunResult(result) {
  els.runResult.hidden = false;
  const success = Boolean(result && result.validation);
  els.runResult.classList.toggle('is-error', !success);
  els.runResultTitle.textContent = success ? result.validation.label : '打卡失败';
  els.runResultList.replaceChildren();

  const items = [];
  if (success) {
    const run = result.run;
    items.push(`记录日期：${run.day}（服务端日期）`);
    items.push(`模拟识别结果：${run.distanceKm} km / ${run.minutes} 分钟 · 模式 ${run.analysis.mode.toUpperCase()}（非真实 OCR）`);
    items.push(`图片：${run.mime}，${formatNumber(run.imageBytes)} 字节`);
    items.push(`SHA256：${run.sha256.slice(0, 24)}…（演示范围内全局去重）`);
    for (const check of result.validation.checks) items.push(`校验：${check}`);
    items.push(`说明：${run.analysis.note}`);
    if (result.replayed) items.push('幂等：本次为同一请求的重试回放，未产生新记录');
  } else {
    items.push(result?.error?.message || '未知错误');
  }

  for (const text of items) {
    const li = document.createElement('li');
    li.textContent = text;
    els.runResultList.append(li);
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('读取本地文件失败'));
    reader.readAsDataURL(file);
  });
}

async function handleFileChange() {
  const file = els.runFile.files?.[0];
  state.fileDataUrl = null;
  state.fileName = '';
  state.fileSize = 0;
  els.previewWrap.hidden = true;
  els.preview.removeAttribute('src');

  if (!file) {
    els.runStatus.textContent = '等待上传';
    return;
  }

  if (!['image/png', 'image/jpeg'].includes(file.type)) {
    els.runStatus.textContent = '文件类型不接受';
    showError(
      { code: 'IMAGE_TYPE_INVALID', message: '请选择真正的 PNG 或 JPEG 图片文件（服务端还会校验文件头）' },
      '截图无效',
    );
    els.runFile.value = '';
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    els.runStatus.textContent = '文件过大';
    showError({ code: 'IMAGE_TOO_LARGE', message: '图片不能超过 2MB，请换一张更小的截图' }, '截图无效');
    els.runFile.value = '';
    return;
  }

  try {
    const dataUrl = await readFileAsDataUrl(file);
    state.fileDataUrl = dataUrl;
    state.fileName = file.name;
    state.fileSize = file.size;
    els.preview.src = dataUrl;
    els.previewWrap.hidden = false;
    els.fileMeta.textContent = `${file.name} · ${formatNumber(file.size)} 字节 · 仅本地预览`;
    els.runStatus.textContent = '已选择截图，待提交';
  } catch (error) {
    showError(error, '读取截图失败');
  }
}

async function submitRun() {
  if (state.busy) return;
  if (!state.fileDataUrl) {
    showError({ code: 'IMAGE_REQUIRED', message: '必须先选择本地跑步截图文件' }, '无法打卡');
    return;
  }
  const distanceText = els.runDistance.value.trim();
  const minutesText = els.runMinutes.value.trim();
  const distanceKm = Number(distanceText);
  const minutes = Number(minutesText);
  if (!distanceText || !Number.isFinite(distanceKm) || distanceKm <= 0) {
    showError({ code: 'DISTANCE_INVALID', message: '模拟距离必须是大于 0 的数字（公里）' }, '无法打卡');
    return;
  }
  if (!minutesText || !Number.isFinite(minutes) || minutes <= 0) {
    showError({ code: 'MINUTES_INVALID', message: '模拟时长必须是大于 0 的数字（分钟）' }, '无法打卡');
    return;
  }

  const imageBase64 = state.fileDataUrl.split(',')[1] || '';
  setBusy(true);
  els.runStatus.textContent = '提交中…';
  try {
    const result = await api('/api/runs', {
      method: 'POST',
      idem: newIdemKey('run'),
      body: { imageBase64, filename: state.fileName, distanceKm, minutes },
    });
    renderRunResult(result);
    showNotice(`跑步打卡已保存：${result.run.day}，${result.run.distanceKm} km（MOCK 模拟识别，图片未做真实 OCR）。`);
    clearRunDraft();
    els.runStatus.textContent = '今日已打卡';
    await refreshCore();
  } catch (error) {
    els.runStatus.textContent = '打卡失败';
    renderRunResult({ error: { message: `${error.message}${error.code ? `（${error.code}）` : ''}` } });
    showError(error, '跑步打卡被拒绝');
  } finally {
    setBusy(false);
  }
}

async function nextDay() {
  if (state.busy) return;
  openConfirm(
    '演示日期前进一天？所有接口会统一切换到新日期，当日排行榜清空；个人历史总步数保留。重启服务会恢复真实日期。',
    performNextDay,
  );
}

async function performNextDay() {
  setBusy(true);
  try {
    const result = await api('/api/demo/next-day', { method: 'POST', body: {} });
    hideBanners();
    clearRunDraft();
    clearRunResult();
    els.runStatus.textContent = '等待上传';
    await loadMeta();
    await refreshCore();
    showNotice(`${result.notice} 当前演示日：${result.day}`);
  } catch (error) {
    showError(error, '切换演示日期失败');
  } finally {
    setBusy(false);
  }
}

async function resetDemo() {
  if (state.busy) return;
  openConfirm('确定重置演示？将清空本次运行中提交的全部数据，重新播种虚构数据，并回到真实日期。', performReset);
}

async function performReset() {
  setBusy(true);
  try {
    const result = await api('/api/demo/reset', { method: 'POST', body: { confirm: 'RESET' } });
    state.boards = null;
    els.stepsInput.value = '';
    clearRunDraft();
    clearRunResult();
    els.runStatus.textContent = '等待上传';
    hideBanners();
    await loadMeta();
    await refreshCore();
    showNotice(`${result.notice} 当前演示日：${result.day}`);
  } catch (error) {
    showError(error, '重置演示失败');
  } finally {
    setBusy(false);
  }
}

function bindEvents() {
  els.identitySelect.addEventListener('change', async () => {
    if (state.busy) {
      els.identitySelect.value = state.userId ?? '';
      showNotice('正在提交，已忽略本次身份切换；请等待当前操作完成后再切换。');
      return;
    }
    state.userId = els.identitySelect.value;
    hideBanners();
    closeConfirm();
    clearRunDraft();
    clearRunResult();
    els.runStatus.textContent = '等待上传';
    try {
      await refreshCore();
      showNotice(`已切换到演示身份：${els.identitySelect.selectedOptions[0]?.textContent || state.userId}。所有读写都以此身份进行。`);
    } catch (error) {
      showError(error, '切换身份失败');
    }
  });

  els.stepsSubmit.addEventListener('click', submitSteps);
  els.stepsInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') submitSteps();
  });

  els.runFile.addEventListener('change', handleFileChange);
  els.runSubmit.addEventListener('click', submitRun);

  for (const button of document.querySelectorAll('[data-metric]')) {
    button.addEventListener('click', async () => {
      state.metric = button.dataset.metric;
      for (const other of document.querySelectorAll('[data-metric]')) {
        other.classList.toggle('active', other === button);
      }
      try {
        await loadBoards();
      } catch (error) {
        showError(error, '加载排行榜失败');
      }
    });
  }

  for (const button of document.querySelectorAll('[data-scope]')) {
    button.addEventListener('click', () => {
      state.scope = button.dataset.scope;
      for (const other of document.querySelectorAll('[data-scope]')) {
        other.classList.toggle('active', other === button);
      }
      renderBoards();
    });
  }

  $('board-refresh').addEventListener('click', async () => {
    try {
      await loadBoards();
      showNotice('排行榜已刷新（服务端日期与数据以本次响应为准）。');
    } catch (error) {
      showError(error, '刷新排行榜失败');
    }
  });

  $('refresh-all').addEventListener('click', async () => {
    try {
      await loadMeta();
      await refreshCore();
      showNotice('已从后端重新加载身份、今日状态与排行榜。');
    } catch (error) {
      showError(error, '刷新失败');
    }
  });

  $('next-day').addEventListener('click', nextDay);
  $('reset-demo').addEventListener('click', resetDemo);
  els.confirmOk.addEventListener('click', confirmPending);
  els.confirmCancel.addEventListener('click', closeConfirm);
  $('error-close').addEventListener('click', () => {
    els.errorBanner.hidden = true;
  });
  $('notice-close').addEventListener('click', () => {
    els.noticeBanner.hidden = true;
  });
}

async function init() {
  bindEvents();
  try {
    await loadMeta();
    els.stepsStatus.textContent = '仅当前演示身份、当前服务端日期';
    await refreshCore();
  } catch (error) {
    showError(error, '初始化失败');
  }
}

init();
