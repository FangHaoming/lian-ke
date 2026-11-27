import { cloudConfig, cloudSession } from './cloud-config.js'
import { sha256 } from './cloud-auth-utils.js'
import { getCloudClient } from './cloud-legacy.js'

export async function buildAgentAccessPrompt() {
  const api = await getCloudClient()
  const { url, anonKey } = cloudConfig()
  const session = cloudSession()
  const accessToken = api.headers.Authorization.replace(/^Bearer\s+/i, '')
  const tokenFingerprint = [...(await sha256(accessToken))]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
  const referenceImageURL = 'https://fanghaoming.github.io/lian-ke/annual-report-reference-template.png'
  const tables = [
    ['training_records', '训练记录'],
    ['training_sets', '训练组及其与训练记录的关联'],
    ['body_weights', '体重记录'],
    ['sleep_records', '睡眠记录'],
    ['challenge_attempts', '挑战成绩'],
    ['plans', '训练计划'],
    ['plan_items', '训练计划项目及其与训练计划的关联'],
  ]

  return `你是一名个人训练数据分析师。请查询我的 Supabase 数据，生成当前统计周期的个人训练年终报告。年份、日期、数值和章节内容必须根据实际数据动态确定，不得写死或编造。

【连接配置】
SUPABASE_URL=${url}
SUPABASE_ANON_KEY=${anonKey}
SUPABASE_ACCESS_TOKEN=${accessToken}
CURRENT_USER=${session?.user?.email || session?.user?.id || '当前登录用户'}
仅在上述区域使用 Token。Token 长度应为 ${accessToken.length}，SHA-256 指纹应为 ${tokenFingerprint}；不一致立即停止。不要输出 Token、完整用户 ID 或凭证错误回显。

【访问规则】
- 只读取当前用户可见数据，依赖 Supabase RLS。
- 只执行 GET：{SUPABASE_URL}/rest/v1/{table}?limit=500；请求头使用 apikey 和 Authorization: Bearer Token。
- 允许读取：
${tables.map(([table, description]) => `${table}：${description}`).join('\n')}
- 每张表先用 limit=1 探测真实字段，再按实际字段识别时间字段和关联字段；禁止猜列名或强行关联。
- 只查询实际报告年份 1 月 1 日至 12 月 31 日的数据，使用 limit=500 分页并稳定排序；不要下载未限定年份的全表。
- 401 或 JWT 错误时用同一原始 Token 重试一次，仍失败则停止并报告认证失败。
- 缺失数据明确说明，不编造。

【图片报告】
默认生成适合手机阅读和分享的简体中文纵向长图，同时保留完整文字报告。若图片能力不可用、失败或中文/数据无法可靠呈现，则输出完整文字报告并说明原因。

参考图片：${referenceImageURL}
请读取该公开图片，参考其深色背景、荧光绿色、浅青色线性图标、圆角卡片、数据图表和信息层级；只借鉴版式风格，不复制其中的年份、日期、数字或正文。若无法访问图片，按文字规范继续生成。

图片要求：纵向长图；卡片式布局；清晰留白；简体中文；不添加英文、其他品牌、虚构数据、水印或乱码。使用日历、哑铃、体重秤、睡眠、奖杯、趋势图、警告和目标等线性图标。品牌可使用“练刻”及官方 Logo：https://fanghaoming.github.io/lian-ke/fit-log-icon.png。

【报告结构】
1. 年度概览
2. 训练频率与训练量
3. 体重变化
4. 睡眠情况
5. 挑战完成情况
6. 明显进步
7. 训练低谷与问题
8. 下一周期行动建议
9. 写给自己的年度总结

请先完成字段探测、数据查询和统计，再输出完整报告；下一周期年份也必须动态计算。`
}
