# AI 人生报告 — 设计文档

- **日期：** 2026-06-26
- **项目：** 人生已完成清单（life-checklist）
- **版本基线：** v6.1.0
- **本次特性：** AI 人生报告（标准版）
- **技术栈：** HTML + Tailwind CSS + 原生 JavaScript + Chart.js + LocalStorage

---

## 1. 目标与背景

为「人生已完成清单」增加一个 **AI 人生报告** 功能：基于用户已有的完成记录、连续打卡、分类数据，一键生成一份个性化的阶段性总结。这是产品 P0 优化方向「AI 赋能」中价值与展示效果最高的功能，能充分消费现有数据，输出有"惊喜感"，适合作品集展示。

**核心定位：** 数据洞察 + AI 生成的"个性化叙事总结"，与现有「统计」页（纯数据可视化）互补而非重复。

---

## 2. 范围（标准版）

### 本次要做（In Scope）
- 按 **时间段（本月 / 本年 / 全部）** 聚合用户数据，生成结构化报告
- **混合 AI 策略**：默认本地规则引擎生成（开箱即用、零配置零成本）；可选填入大模型 API Key 调用真实 AI 增强
- 报告内容：AI 寄语 + 数据概览 + 分类洞察 + 高光时刻 + AI 点评与下一步建议
- 报告页支持 **保存为图片 / 复制文字 / 重新生成**（保存图片复用现有 `share.js`）
- 「我的」页新增「AI 助手设置」用于配置 API Key

### 本次不做（Out of Scope，YAGNI）
- 趋势图表、"人生电影"逐屏叙事、年度特效（属沉浸版，后续迭代）
- 其他 AI 功能（智能推荐清单、AI 格言、目标拆解）
- 后端服务、云同步、定时推送

---

## 3. 架构与模块划分

只做加法，**不改动现有功能的核心逻辑**。新增 2 个模块，扩展 1 个：

| 模块 | 类型 | 职责 |
|------|------|------|
| `js/report.js` | 新增·核心 | 数据聚合、报告页渲染、时间段切换、触发分享 |
| `js/aiService.js` | 新增 | AI 文案生成层，封装"规则引擎 / 真实 API"混合策略 |
| `js/settings.js` | 扩展 | 新增 AI 配置存储（厂商、apiKey、model、开关） |

**模块拆分理由：** `report.js` 负责"报告的数据与展示"，`aiService.js` 负责"文案从哪来"。两者通过统一接口 `generateNarrative(reportData)` 通信，使得 `aiService` 可独立测试，未来的 AI 推荐、AI 格言等功能也能复用同一套服务层。

### 模块加载顺序
在 `index.html` 中，于 `app.js` 之前依次加入：
```html
<script src="js/aiService.js"></script>
<script src="js/report.js"></script>
```
（`settings.js` 已在现有顺序中，扩展即可。）

---

## 4. 数据流

```
用户点击「生成报告」
  → report.js  aggregateReportData(period)      // 读 storage，按时间段 + 分类聚合
  → reportData { 时段, 完成数, 分类分布, 打卡, 成就, 人生进度, 高光时刻 }
  → aiService.generateNarrative(reportData)
        ├─ 有 Key 且启用 → callRealAPI()   → 真实大模型文案
        └─ 无 Key / 调用失败 → callRuleEngine() → 本地规则引擎文案（兜底）
  → report.js  renderReport(reportData, narrative)   // 渲染到 #report-view
  → 用户可「保存为图片」(复用 ShareManager.captureCard)
```

**核心思想：** 数据聚合与文案生成解耦，文案层永远有兜底，保证任何情况下都能出报告。

---

## 5. 数据聚合层（reportData 结构）

`aggregateReportData(period)` 是一个**纯函数**，输入时间段，输出结构化数据。基于现有 `StorageManager` 的数据：

```js
{
  period: 'month',                    // 'month' | 'year' | 'all'
  periodLabel: '2026 年 6 月',         // 展示用标签
  totalCompleted: 12,                 // 该时段完成任务数
  byCategory: [                       // 分类分布（按清单分组）
    { title: '旅行', emoji: '✈️', count: 5 },
    { title: '美食', emoji: '🍜', count: 3 }
  ],
  topCategory: { title: '旅行', emoji: '✈️', count: 5 },  // 最活跃分类
  streak: { current: 7, longest: 15 },                    // 连续打卡（累计值）
  totalAchievements: 8,               // 已解锁成就数
  lifeProgress: { age: 28, daysLived: 10220, percent: 38 },// 人生进度
  highlights: [                       // 高光时刻（该时段带照片的 timeline 事件）
    { title: '完成「中国城市打卡」: 西藏', emoji: '✈️', photo: '...' }
  ],
  mostActiveDay: { date: '6-18', count: 4 }               // 最活跃的一天
}
```

### 数据来源映射
- `totalCompleted` / `byCategory` / `mostActiveDay`：遍历 `StorageManager.getLists()` 的任务，按 `task.completedDate` 过滤时间段并按清单分组；或结合 `getTimeline()` 的 `event.date`
- `streak`：`StorageManager.getStreakData()`
- `totalAchievements`：`StorageManager.getUnlockedAchievements().length`
- `lifeProgress`：`StorageManager.getBirthDate()` + `calculateLifeProgress()`
- `highlights`：`getTimeline()` 中该时段、且含照片字段的事件

### ⚠️ 数据约束（重要）
成就与打卡只存储了"累计值 / id 列表"，**没有解锁时间戳**，无法精确追溯"本月解锁了哪些成就"。因此：
- 时间段切片主要依赖**有时间戳的数据**：`task.completedDate`（YYYY-MM-DD）、`timeline event.date`（ISO）
- 成就数、最高连击作为"**截至目前**"的累计成果展示，不做时段切分

这是现有数据结构下的合理取舍，不影响报告的核心价值。

---

## 6. AI 生成层（混合策略）

`aiService.generateNarrative(reportData)` 为统一入口，内部按配置选择实现：

### 6.1 本地规则引擎 `callRuleEngine(reportData)`（默认）
- 零配置、零成本、纯前端、即时生成
- 基于模板话术 + 数据填充，生成 4 段文案：
  1. **开场总结** — 时段完成情况
  2. **亮点** — 最活跃分类 / 高光时刻
  3. **坚持鼓励** — 连续打卡
  4. **下一步建议** — 基于进度的引导
- 每段内置多组措辞，随机组合，避免千篇一律
- 返回结构：`{ source: 'rule', greeting, highlight, encouragement, suggestion }`

### 6.2 真实 API `callRealAPI(reportData, config)`（可选增强）
- 采用 **OpenAI 兼容的 `/chat/completions` 格式**，Kimi（Moonshot）、DeepSeek、智谱 GLM 均兼容
- 预置厂商 baseURL 选项（用户填 Key 即可）：

  | 厂商 | baseURL | 示例模型 |
  |------|---------|----------|
  | Kimi | `https://api.moonshot.cn/v1` | `moonshot-v1-8k` |
  | DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` |
  | 智谱 GLM | `https://open.bigmodel.cn/api/paas/v4` | `glm-4-flash` |

- 把 `reportData` 组织成结构化 prompt，要求 AI 以温暖、个性化口吻撰写报告
- `fetch` 前端直连，Key 仅存 localStorage，**不经过任何中间服务器**
- 请求超时默认 15s；超时 / 网络错误 / 返回异常 → 自动降级 `callRuleEngine` + toast 提示
- 返回结构：`{ source: 'api', text }`（整段文案）

### 6.3 安全说明
前端直连意味着 Key 存在浏览器本地。在"个人工具、用自己的 Key"场景下这是合理取舍。UI 中提示用户使用**有额度上限的 Key**。这一"安全权衡"在作品集中是一个可讲的设计决策点。

---

## 7. UI / 报告页面

### 7.1 视图与入口
- 新增 `<div id="report-view" class="hidden">`，复用现有 SPA 视图切换机制（`xxx-view` + `hidden` 类）
- **两处入口：**
  1. 「统计」页顶部 — 「✨ 生成 AI 人生报告」主按钮（数据中心，语义最契合）
  2. 「我的」页设置区上方 — 一个醒目卡片入口

### 7.2 报告页线框
```
┌─────────────────────────────┐
│  ← 返回        ✨ 人生报告        │
│  [ 本月 | 本年 | 全部 ]  ← 时段切换 │
├─────────────────────────────┤
│ ╭─ 可截图卡片区 ───────────╮ │
│ │ 📅 2026年6月 · 我的人生报告  │ │
│ │ "这个月你完成了 12 件事…"   │ │ ← AI 寄语
│ │ ┌──────┬──────┬──────┐    │ │
│ │ │完成12 │连击7天│进度38%│   │ │ ← 数据概览
│ │ └──────┴──────┴──────┘    │ │
│ │ 🏆 最活跃：✈️旅行 (5件)     │ │ ← 分类洞察 + 分布条
│ │ 📸 高光时刻 [照片回忆]      │ │ ← 若有照片
│ │ 💬 AI 点评 + 下一步建议      │ │
│ ╰───────────────────────╯ │
│ [🔄重新生成] [💾保存图片] [📋复制] │
└─────────────────────────────┘
```

### 7.3 交互细节
- 生成时显示"AI 正在为你撰写人生报告…"加载动画（API 调用有延迟）
- 时段切换 Tab 实时重新聚合并生成
- 「保存为图片」复用 `ShareManager.captureCard()`（html2canvas）
- API Key 在「我的」→设置→「AI 助手设置」配置：选厂商、填 Key、选模型，提供"测试连接"按钮

---

## 8. 错误处理 & 降级

| 场景 | 处理 |
|------|------|
| 未配置 Key | 无感使用规则引擎 |
| API 超时 / 网络错 / 返回异常 | 降级规则引擎 + toast「AI 服务暂不可用，已使用本地报告」 |
| 新用户 / 无任何完成记录 | 友好引导文案，不显示空报告 |
| 某时段无数据 | 「这个时段还没有完成记录，去完成第一个目标吧」 |
| 测试连接失败 | 明确提示 Key / 网络 / 厂商错误，不保存无效配置 |

---

## 9. 测试策略

纯前端项目，无测试框架，采用：
- **手动测试清单**：覆盖 时段(月/年/全部) × 有/无 Key × API(成功/失败/超时) × 空数据 × 新用户
- **聚合函数自测**：`aggregateReportData` 为纯函数，新增 `test/report-test.html`，用 mock 数据断言聚合结果正确
- **演示用 mock 数据**：提供一键填充示例数据的开发函数，便于作品集录屏演示

---

## 10. 验收标准

1. 「统计」页与「我的」页均能进入报告页
2. 切换"本月 / 本年 / 全部"，报告数据随之正确变化
3. 未配置 Key 时，规则引擎能生成 4 段通顺、有数据支撑的文案
4. 配置有效 Key 后，能调用真实大模型生成报告；Key 无效 / 超时能正确降级且有提示
5. 报告可保存为图片、可复制文字
6. 新用户 / 空时段有友好引导，不出现报错或空白
7. 不破坏任何现有功能（首页、进度、大全、人生轴、统计、我的）
8. 代码注释为中文，风格与现有模块一致

---

## 11. 涉及文件清单

| 文件 | 操作 |
|------|------|
| `js/aiService.js` | 新增 |
| `js/report.js` | 新增 |
| `js/settings.js` | 扩展（AI 配置存储） |
| `js/profile.js` | 扩展（设置项加「AI 助手设置」+ 报告入口卡片） |
| `js/statistics.js` | 扩展（统计页顶部加报告入口按钮） |
| `index.html` | 扩展（新增 report-view、引入两个新脚本） |
| `css/style.css` | 扩展（报告页与设置弹窗样式） |
| `js/app.js` | 扩展（report-view 的视图切换接线） |
| `test/report-test.html` | 新增（聚合函数自测） |
