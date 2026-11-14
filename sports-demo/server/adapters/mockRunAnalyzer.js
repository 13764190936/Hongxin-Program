// 跑步截图分析适配器。
// 当前实现是显式 MOCK：不读取图片内容、不做 OCR、不判断截图真伪，
// 只把用户填写的“模拟识别结果”原样带回并标注。
// 后续接真实 OCR：返回同样的结构，并把 mock 设为 false，同时给出识别依据。
export function createMockRunAnalyzer() {
  return {
    id: 'mock-analyzer',
    label: 'MOCK 模拟识别',
    async analyze({ submitted }) {
      return {
        mode: 'mock',
        mock: true,
        distanceKm: submitted.distanceKm,
        minutes: submitted.minutes,
        confidence: null,
        note: 'MOCK：未进行真实 OCR 或图像识别；距离/时长为模拟输入，图片仅用于演示上传与字节去重',
      };
    },
  };
}
