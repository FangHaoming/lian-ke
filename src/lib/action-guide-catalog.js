export const actionGuides = [
  {
    action: '标准俯卧撑',
    startPage: 89,
    endPage: 91,
    title: '标准俯卧撑动作示范',
    description: '下降至胸部接近地面，再推回起始位。',
    gif: 'action-guides/standard-pushup.gif',
  },
]

export function actionGuideFor(action) {
  const normalized = String(action || '').trim()
  return actionGuides.find((guide) => guide.action === normalized) || null
}
