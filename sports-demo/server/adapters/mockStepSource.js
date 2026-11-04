// 步数来源适配器：当前为“模拟微信步数快照”，不会访问微信。
// 后续接真实来源时，实现同样的 snapshot() 签名即可。
export function createMockStepSource() {
  return {
    id: 'mock-wechat',
    label: '模拟微信步数快照',
    async snapshot({ userId, day, absoluteSteps }) {
      return {
        userId,
        day,
        steps: absoluteSteps,
        source: 'mock-wechat-snapshot',
        simulated: true,
        note: 'MOCK：模拟微信步数快照（绝对累计值），非真实微信数据',
      };
    },
  };
}
