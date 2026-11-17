export const actionGuides = [
  {
    action: '墙壁俯卧撑',
    startPage: 79,
    endPage: 81,
    title: '墙壁俯卧撑动作示范',
    description: '身体保持一线，屈肘靠近墙面后推回。',
    gif: 'action-guides/wall-pushup.gif',
  },
  {
    action: '上斜俯卧撑',
    startPage: 82,
    endPage: 83,
    title: '上斜俯卧撑动作示范',
    description: '双手支撑稳定的高台，身体保持一线完成推起。',
    gif: 'action-guides/incline-pushup.gif',
  },
  {
    action: '膝盖俯卧撑',
    startPage: 84,
    endPage: 86,
    title: '膝盖俯卧撑动作示范',
    description: '以膝盖支撑，躯干与大腿保持对齐。',
    gif: 'action-guides/kneeling-pushup.gif',
  },
  {
    action: '半俯卧撑',
    startPage: 87,
    endPage: 88,
    title: '半俯卧撑动作示范',
    description: '控制下降到限定高度，再推回起始位。',
    gif: 'action-guides/half-pushup.gif',
  },
  {
    action: '标准俯卧撑',
    startPage: 89,
    endPage: 91,
    title: '标准俯卧撑动作示范',
    description: '下降至胸部接近地面，再推回起始位。',
    gif: 'action-guides/standard-pushup.gif',
  },
  {
    action: '窄距俯卧撑',
    startPage: 92,
    endPage: 93,
    title: '窄距俯卧撑动作示范',
    description: '双手靠近，完整屈肘和推起。',
    gif: 'action-guides/close-pushup.gif',
  },
  {
    action: '偏重俯卧撑',
    startPage: 94,
    endPage: 96,
    title: '偏重俯卧撑动作示范',
    description: '一手放在高处，另一手在地面；换侧分别完成。',
    gif: 'action-guides/uneven-pushup.gif',
  },
  {
    action: '单臂半俯卧撑',
    startPage: 97,
    endPage: 98,
    title: '单臂半俯卧撑动作示范',
    description: '单手支撑，完成上半程；左右分别记录。',
    gif: 'action-guides/half-one-arm-pushup.gif',
  },
  {
    action: '杠杆俯卧撑',
    startPage: 99,
    endPage: 101,
    title: '杠杆俯卧撑动作示范',
    description: '辅助臂向侧面伸直，控制下降推起；两侧分别完成。',
    gif: 'action-guides/lever-pushup.gif',
  },
  {
    action: '单臂俯卧撑',
    startPage: 102,
    endPage: 104,
    title: '单臂俯卧撑动作示范',
    description: '单手支撑完整下压推起，保持躯干稳定，左右分别完成。',
    gif: 'action-guides/one-arm-pushup.gif',
  },
]

export function actionGuideFor(action) {
  const normalized = String(action || '').trim()
  return actionGuides.find((guide) => guide.action === normalized) || null
}
