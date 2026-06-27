# AI 目标拆解(目标路线图)设计文档

**项目：** 人生已完成清单
**版本：** v6.4.0(规划中)
**日期：** 2026-06-27
**作者：** Claude Code（与翅膀协作）
**状态：** 已确认,待实现

---

## 1. 背景与目标

### 1.1 背景
v6.2.0 的「AI 人生报告」、v6.3.0 的「AI 智能推荐清单」都采用「本地规则引擎 + 可选大模型」的混合 AI 策略。下一个 AI 功能「AI 目标拆解」延续这条「AI 人生教练」主线:解决用户**有一个宏大目标、却不知道如何拆成可执行步骤**的痛点。

与前两个功能不同:报告/推荐有充分的本地数据可走规则,而「任意目标拆解」高度依赖语义理解,因此降级策略是本功能的设计核心。

### 1.2 目标
- 用户输入一个宏大/模糊目标(+期限),AI 拆成**带阶段里程碑的路线图**(3 阶段)
- 用户可在预览里**编辑/删除**子任务后,**一键生成专属清单**,加入「我的人生进度」打卡
- 默认零配置可用(本地模板库兜底),配置 AI Key 后拆解更精准个性化
- 保持与前两个 AI 功能一致的混合架构与优雅降级

### 1.3 成功标准
- 用户未配置 AI 时,功能 100% 可用(本地模板库 + 通用四步法兜底)
- 拆解结果落地后,任务天然接入既有打卡闭环(完成 → 打卡 → 人生轴)
- 路线图阶段分组清晰,单阶段任务数受控(2-4 个),不让用户认知超载
- 核心纯函数(目标解析、本地路线图、归类、落地)有单元测试覆盖

---

## 2. 功能范围

### 2.1 In Scope
- 进度页(lists-view)顶部「AI 目标拆解」入口卡片
- 全屏 modal:目标输入(目标文本 + 期限 chips)
- AI / 本地引擎生成 3 阶段路线图
- 路线图预览:阶段分组卡片、来源标识、**可删除单条任务**、**换一种拆法**
- 一键生成专属清单(复用清单系统落地)
- 本地模板库(常见目标类型)+ 通用四步法兜底
- 单元测试

### 2.2 Out of Scope(YAGNI)
- 对话式多轮追问(本期用「目标 + 期限」一次性输入)
- 子任务的递归无限展开(Goblin Tools 式)
- 拆解粒度滑块(Goblin Tools 辣度),本期用「期限」隐含粒度
- 阶段绑定到具体日历日期/提醒
- 路线图保存为分享图片(留待后续,全屏 modal 不做截图)
- 首页副入口、示例目标快捷填充(已确认不做)

---

## 3. 用户场景

### 场景 A:有明确目标的用户(本地兜底)
小翅没配置 AI Key。在进度页点「🎯 让 AI 帮你拆解目标」,输入「一年读完 50 本书」,选期限「1 年」。本地引擎识别为「阅读」类,套用模板生成 3 阶段路线图。小翅删掉一条不需要的任务,点「生成专属清单」,清单「📚 一年读完 50 本书」出现在进度页,可逐条打卡。

### 场景 B:模糊目标 + AI 增强
小翅配置了 Kimi Key,输入「我想成为一名插画师」。本地模板库匹配不到,但因有 AI,调用大模型返回结构化路线图(打基础学绘画 → 练习风格 → 建立作品集)。来源标识显示「✨ AI 生成」。

### 场景 C:AI 失败降级
小翅的 Key 失效或超时。系统自动降级到本地「目标四步法」(明确目标 → 制定计划 → 分阶段执行 → 定期复盘),toast 提示「AI 暂不可用,已用本地拆解」,流程不中断。

---

## 4. 架构设计

### 4.1 模块划分

| 文件 | 类型 | 职责 |
|------|------|------|
| `js/goalBreakdown.js` | 新增 | 目标拆解引擎:解析目标、本地模板库、AI 拆解、归类、落地为清单(纯逻辑,不依赖 DOM) |
| `js/goalBreakdownUI.js` | 新增 | 全屏 modal 的渲染与交互(输入 / loading / 路线图预览 / 生成 / 落地后刷新 UI) |
| `js/aiService.js` | 扩展 | `callRealAPIWithPrompt` 支持 `maxTokens` 选项;新增 `generateGoalRoadmap()` |
| `js/app.js` | 修改 | `bindEvents()` 绑定进度页入口卡片点击 |
| `index.html` | 修改 | 进度页加入口卡片;引入两个新脚本 |
| `css/style.css` | 修改 | 入口卡片、全屏 modal、阶段卡片、来源标识样式 |
| `test/goal-breakdown-test.cjs` | 新增 | 单元测试 |

> 注:UI 与引擎拆成两个文件,保持「纯逻辑可单测」与「DOM 渲染」的边界清晰(引擎不依赖 DOM)。

### 4.2 依赖关系
```
goalBreakdown.js(引擎,纯逻辑)
  ├── settings.js(SettingsManager.getAIConfig)
  ├── aiService.js(可选 AI 拆解)
  ├── storage.js(getLists/setLists 落地)
  └── 不依赖 DOM

goalBreakdownUI.js(渲染)
  ├── goalBreakdown.js(调用引擎)
  └── app.js 的全局渲染函数(renderListCards 等,落地后刷新)
```

### 4.3 脚本加载顺序(index.html)
在 `aiService.js` 之后、`app.js` 之前插入:
```html
<script src="js/aiService.js"></script>
<script src="js/recommendations.js"></script>
<script src="js/goalBreakdown.js"></script>      <!-- 新增 -->
<script src="js/goalBreakdownUI.js"></script>    <!-- 新增 -->
<script src="js/templates.js"></script>
...
<script src="js/app.js"></script>
```

---

## 5. 交互流程(全屏 modal)

```
进度页入口卡片「🎯 有个大目标?让 AI 帮你拆解」
        ↓ 点击
① 全屏 modal · 输入态
   ┌──────────────────────────────┐
   │ ×关闭         AI 目标拆解         │
   │                                │
   │  你的目标是什么?                  │
   │  [ 一年读完 50 本书__________ ]   │
   │                                │
   │  期限: (3个月)(6个月)(1年)(自定义) │  ← chips 单选
   │                                │
   │         [ 开始拆解 ✨ ]          │
   └──────────────────────────────┘
        ↓ 点「开始拆解」
② loading 态:「AI 正在为你规划路线图…」
   有 Key → generateGoalRoadmap(AI);无 Key/失败 → 本地引擎
        ↓
③ 路线图预览态
   ┌──────────────────────────────┐
   │ ←返回   📚 一年读完50本书  ✨AI生成 │  ← 来源标识
   │                                │
   │ 🚩 阶段一 · 第1-3月 打基础         │
   │   □ 列出 15 本书单           ✕   │  ← 可删除单条
   │   □ 每天固定 30 分钟阅读      ✕   │
   │ 🚩 阶段二 · 第4-8月 推进提速       │
   │   □ 每月读完 5 本            ✕   │
   │   □ 写读书笔记               ✕   │
   │ 🚩 阶段三 · 第9-12月 冲刺收尾      │
   │   □ 补齐进度 + 年度复盘       ✕   │
   │                                │
   │ [ 🔄 换一种拆法 ] [ 生成专属清单 ] │
   └──────────────────────────────┘
        ↓ 点「生成专属清单」
④ createListFromRoadmap → setLists → 关闭 modal → UI 层调用刷新函数
   → toast「清单已生成 ✅」→ 进度页刷新并展示新清单
```

**交互要点(竞品借鉴):**
- **可删除单条任务**(Todoist 草稿可编辑思路):AI 拆解不是不可改的圣旨,用户保留自主权
- **阶段分组卡片 + 每阶段 2-4 个任务**(CHI 论文:别一次堆太多,分组减少认知超载)
- **换一种拆法**:重新调用引擎(AI 有 Key 时换一版;本地时换模板变体),不限次数(用户主动触发单个目标,不像推荐需限频)
- 期限用 chips,降低输入成本;自定义期限弹出小输入

---

## 6. 目标拆解引擎(goalBreakdown.js)

### 6.1 路线图数据结构
```js
{
  source: 'rule' | 'api',     // 来源标识(与 AIService 一致)
  goal: '一年读完50本书',       // 用户原始目标
  duration: '1年',             // 期限
  category: '阅读',            // 智能归类结果(高置信)或 '自定义'
  emoji: '📚',                 // 按 category 取
  phases: [
    { title: '打基础', timeLabel: '第1-3个月', tasks: ['列出15本书单', '每天固定30分钟阅读'] },
    { title: '推进提速', timeLabel: '第4-8个月', tasks: ['每月读完5本', '写读书笔记'] },
    { title: '冲刺收尾', timeLabel: '第9-12个月', tasks: ['补齐进度', '年度复盘'] }
  ],
  degraded: false              // AI 失败降级时为 true
}
```

### 6.2 核心方法
```js
const GoalBreakdownEngine = {
  GOAL_TYPES: { /* 关键词 → 类型/分类/emoji/模板,见 7 */ },

  // 关键词匹配目标类型(纯函数)。无匹配返回 null
  classifyGoal(goalText) { ... },          // → { type, category, emoji } | null

  // 本地模板库生成路线图(纯函数,零依赖)
  buildLocalRoadmap(goalText, duration) {  // → roadmap(source:'rule')
    // 1. classifyGoal:命中 → 套模板;未命中 → 通用四步法 + category:'自定义'
    // 2. 按 duration 计算各阶段 timeLabel
  },

  // 组织给大模型的 prompt(要求返回严格 JSON)
  buildPrompt(goalText, duration) { ... },

  // 统一入口:有 Key 调 AI,失败/无 Key 降级本地
  async generateRoadmap(goalText, duration) {
    const cfg = SettingsManager.getAIConfig();
    if (!cfg.enabled || !cfg.apiKey) return this.buildLocalRoadmap(goalText, duration);
    try {
      const roadmap = await AIService.generateGoalRoadmap(goalText, duration);
      return roadmap;                       // { source:'api', ... }
    } catch (e) {
      const local = this.buildLocalRoadmap(goalText, duration);
      local.degraded = true;
      return local;
    }
  },

  // 落地:路线图 → 专属清单(写入 Storage,返回新清单;不刷新 UI,由调用方处理)
  createListFromRoadmap(roadmap) { ... }    // → newList
}
```

### 6.3 智能归类(决策点 c:保守归类)
- 命中关键词(高置信)→ 归到现有分类;**未命中/不确定 → `category: '自定义'`**,绝不硬分(竞品 Arootah 教训:分类乱→用户困惑)
- 归类同时决定清单的 `emoji` 与 `color`

| 目标关键词 | category | emoji |
|---|---|---|
| 读书/看书/阅读/书 | 阅读 | 📚 |
| 健身/减肥/跑步/运动/马拉松 | 挑战 | 💪 |
| 英语/外语/口语/日语/雅思 | 成长 | 🗣️ |
| 学/技能/吉他/编程/画画/乐器/摄影 | 成长 | 🎯 |
| 旅行/环游/去/打卡/城市 | 旅行 | ✈️ |
| 美食/做饭/烘焙/料理 | 美食 | 🍜 |
| 存钱/理财/投资/攒钱 | 人生 | 💰 |
| (无匹配) | 自定义 | 🎯 |

> 关键词表可迭代扩充;匹配用「包含」+ 简单优先级,命中第一个即返回。「画画」用双字避免「插画师」「计划」等误匹配(故场景 B 走 AI)。

---

## 7. 本地模板库设计(降级核心)

每种目标类型 = 一个生成函数 `(goalText, duration) → phases[]`,产出 3 阶段、各 2-4 个任务。任务文案用「动宾短语」,可含目标关键词。

**覆盖类型(本期):** 阅读、健身、语言、技能、旅行、美食、理财 + **通用四步法**(兜底)。

**通用四步法(无匹配时):**
```
阶段一 · 明确与准备:把目标写清楚、了解需要什么、列出第一步
阶段二 · 分阶段执行:拆成可每周推进的小任务、定期记录进展
阶段三 · 复盘与冲刺:检查进度、调整方法、完成收尾
```

**阶段 timeLabel 按 duration 推算:**
- 3 个月 → 第 1 月 / 第 2 月 / 第 3 月
- 6 个月 → 第 1-2 月 / 第 3-4 月 / 第 5-6 月
- 1 年 → 第 1-3 月 / 第 4-8 月 / 第 9-12 月
- 自定义/未知 → 阶段一 / 阶段二 / 阶段三(不带具体时间)

---

## 8. AI 集成(aiService.js 扩展)

### 8.1 修复 `callRealAPIWithPrompt` 的 token 限制
现状 `max_tokens` 硬编码 80(为「润色一句话」设计),路线图输出会被截断。改为支持选项(非兼容性 hack,默认值保持原行为):
```js
async callRealAPIWithPrompt(prompt, config, options = {}) {
  ...
  body: JSON.stringify({
    model: config.model,
    messages: [...],
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 80   // 目标拆解传 800
  })
  ...
}
```

### 8.2 新增 `generateGoalRoadmap`
```js
async generateGoalRoadmap(goalText, duration) {
  const cfg = SettingsManager.getAIConfig();          // 调用前已确保有 Key
  const prompt = GoalBreakdownEngine.buildPrompt(goalText, duration);
  const text = await this.callRealAPIWithPrompt(prompt, cfg, { maxTokens: 800, temperature: 0.7 });
  const roadmap = this._parseRoadmapJSON(text);       // 容错解析,失败抛错
  roadmap.source = 'api';
  return roadmap;
}
```

### 8.3 结构化输出与容错(本功能最大技术风险)
- prompt 要求大模型**只返回严格 JSON**:`{ goal, duration, category, phases:[{title,timeLabel,tasks:[]}] }`
- `_parseRoadmapJSON`:
  1. 去掉可能的 ` ```json ``` ` 代码块包裹
  2. `JSON.parse`
  3. **校验形状**(phases 是非空数组、每阶段有 title 和 tasks 数组);不合法 → 抛错
  4. **规整 category**:AI 返回的 category 不一定落在现有分类内,统一过一遍白名单校验(同 `classifyGoal` 的分类集),未知则置 `'自定义'`——保证落地 category 始终合法,不污染推荐引擎的 `completedByCategory` 统计
- 任何解析失败 → `generateRoadmap` 的 catch 降级本地。**绝不把坏数据落地。**

---

## 9. 落地为专属清单(createListFromRoadmap)

复用既有清单系统,**一次性写入**(避免循环 addTaskToList 的 id 撞车与重复渲染)。

```js
createListFromRoadmap(roadmap) {
  const lists = StorageManager.getLists() || [];
  const stamp = Date.now();
  const newList = {
    id: 'goal_' + stamp,
    emoji: roadmap.emoji,
    title: roadmap.goal,
    description: roadmap.duration + ' · AI 目标路线图',
    color: COLOR_BY_CATEGORY[roadmap.category] || '#5E5CE6',  // 沿用 data.js 各分类色板;自定义用 #5E5CE6
    category: roadmap.category,        // 高置信分类 or '自定义'
    isCustom: true,
    fromGoal: true,                    // 标记来源,便于后续统计/区分
    tasks: roadmap.phases.flatMap((p, pi) =>
      p.tasks.map((t, ti) => ({
        id: `task_${stamp}_${pi}_${ti}`,          // 加 phase/task 索引,杜绝撞 id
        text: `阶段${pi + 1}·${t}`,                // 决策点 b:阶段前缀
        completed: false, completedDate: '', note: '', priority: 'medium'
      }))
    )
  };
  lists.push(newList);
  StorageManager.setLists(lists);
  AppState.lists = lists;
  return newList;
}
```

**UI 刷新由 `goalBreakdownUI.js` 在落地后负责调用**(`renderListCards` / `updateListsOverview` / `updateOverallStats`),保持引擎不依赖 DOM。落地后任务天然接入既有闭环:勾选 → `StorageManager.updateTaskStatus` → 记完成日期、今日计数、连续打卡、写人生轴。**无需额外处理。**

---

## 10. 错误处理

| 场景 | 处理 |
|------|------|
| 未配置 AI | 直接走本地模板库 / 四步法 |
| AI 超时/网络/CORS 失败 | 降级本地,`degraded:true`,toast 提示,不中断 |
| AI 返回非法 JSON / 形状错误 | 解析抛错 → 降级本地,绝不落地坏数据 |
| 目标输入为空 | 「开始拆解」按钮禁用 / 输入框抖动提示 |
| 期限未选 | 默认「1 年」 |
| LocalStorage 写入失败 | try/catch,toast「保存失败,请重试」 |

---

## 11. 测试计划(test/goal-breakdown-test.cjs)

沿用 `recommendations-test.cjs` 的 Node `vm` + 假 localStorage 范式,bundle:`data.js, storage.js, settings.js, aiService.js, goalBreakdown.js`(不含 UI)。覆盖:

1. **classifyGoal**:「读完50本书」→ 阅读;「学游泳」→ 成长;「随便写点啥」→ null(走自定义)
2. **buildLocalRoadmap**:返回 3 阶段、每阶段 tasks 非空;命中模板与未命中(四步法)两条路径
3. **timeLabel 推算**:1 年 → 第 1-3 月 / 第 4-8 月 / 第 9-12 月
4. **保守归类**:未命中关键词时 category === '自定义'
5. **createListFromRoadmap**:生成清单结构正确;**所有 task.id 唯一**(防撞车回归测试);task.text 带「阶段N·」前缀
6. **AI 降级**:未配置 Key 时 `generateRoadmap` 返回 source==='rule'
7. **_parseRoadmapJSON**:合法 JSON 解析成功;非法 / 缺 phases 抛错;未知 category 规整为「自定义」

> 遵循「修 bug 先写测试」:第 5 条专门守护「task id 撞车」这个已识别的坑。

---

## 12. UI / CSS 要点

- **入口卡片**:进度页 `#list-cards-container` 之前,渐变背景 + 🎯 图标 + 一句引导文案
- **全屏 modal**:`.goal-modal-overlay`(占满视口、可滚动),内含输入态 / loading 态 / 预览态三个区块切换(JS 控制显隐),不复用居中 `.modal-content`
- **阶段卡片**:`.goal-phase`(🚩 标题 + timeLabel + 任务列表),阶段间留白区分
- **来源标识**:`✨ AI 生成` / `📋 智能模板`,复用推荐功能已有的来源标识视觉
- **期限 chips**:`.goal-duration-chip`,单选高亮

---

## 13. 实现顺序

1. `js/goalBreakdown.js`:引擎(classifyGoal、本地模板库、buildPrompt、generateRoadmap、createListFromRoadmap)
2. `js/aiService.js`:扩展 `callRealAPIWithPrompt` 选项 + `generateGoalRoadmap` + `_parseRoadmapJSON`
3. `test/goal-breakdown-test.cjs`:单元测试(逻辑层先测通)
4. `index.html`:进度页入口卡片 + 引入脚本
5. `js/goalBreakdownUI.js`:全屏 modal 渲染与交互
6. `js/app.js`:bindEvents 绑定入口
7. `css/style.css`:入口卡片 + 全屏 modal + 阶段卡片样式
8. `README.md` / `CHANGELOG.md`:更新到 v6.4.0

---

## 14. 风险与应对

| 风险 | 应对 |
|------|------|
| AI 返回结构化 JSON 不稳定 | prompt 强约束「只返回 JSON」+ 形状校验 + 失败降级本地;本功能最大风险点 |
| 本地模板拆解偏泛 | 覆盖常见类型 + 通用四步法兜底;预览可删改;有 Key 时 AI 更精准 |
| 任务 id 撞车 | 一次性构造 tasks(id 带 phase/task 索引),单测守护 |
| 拆解任务过多致认知超载 | 固定 3 阶段、每阶段 2-4 个;预览分组展示(CHI 论文依据) |
| 归类错误致用户困惑 | 保守归类,不确定即「自定义」(Arootah 教训) |
| 全屏 modal 与现有 view 切换冲突 | modal 是 overlay,不进 `showXxx` 体系,关闭即还原,无需改导航 |

---

## 15. 竞品调研依据(2026-06-27)

> 来源:deep-research 工作流抓取的真实竞品数据(Search + Fetch 阶段;因子代理失控,未完成对抗核验与综合,结论按「已抓取证据」采纳,标注为参考强度而非定论)。

| 结论 | 依据 |
|------|------|
| 路线图(阶段)是差异化方向 | Goblin Tools 强在递归拆解但**无阶段/时间维度**;Perdoo 2025 新增「Milestone」类型印证阶段范式 |
| 拆解结果应可编辑再提交 | Todoist AI:拆解作为**草稿**,可接受/编辑/丢弃 |
| 别一次堆太多、分组、保留自主权 | CHI 2026 论文(学术 primary):用户「一次显示太多子任务会不知所措」,要限制数量、按进度分组、保留自主权 |
| 预览用全屏聚焦形态 | iOS HIG / UX 社区:AI 任务拆解属「需全神贯注的关键任务」,应全屏聚焦、完成返回触发页 |
| 保守归类 | Arootah:habit/task 分类不清导致用户困惑 |
| 粒度滑块本期不做 | Goblin Tools 辣度滑块虽好,但属「纯列表 + 递归」范式;我们是路线图 + 轻量移动端,期限已隐含粒度 |

---

**下一步:** 翅膀审查本设计文档,确认无误后进入实现计划(writing-plans)阶段。
