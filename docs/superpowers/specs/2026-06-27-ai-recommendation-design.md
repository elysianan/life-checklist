# AI 智能推荐清单设计文档

**项目：** 人生已完成清单  
**版本：** v6.3.0  
**日期：** 2026-06-27  
**作者：** Claude Code（与翅膀协作）  
**状态：** 已确认，待实现

---

## 1. 背景与目标

### 1.1 背景
当前版本 v6.2.0 已完成 AI 人生报告功能，采用「本地规则引擎 + 可选大模型」的混合 AI 策略。产品下一步计划中的 AI 智能推荐清单，是提升内容发现效率、解决用户「不知道做什么」痛点的核心功能。

### 1.2 目标
- 在「清单大全」页面顶部提供个性化的「为你推荐」卡片区
- 在「我的人生进度」空状态时提供引导
- 默认零配置可用，有 AI Key 时推荐理由更自然
- 保持与 AI 人生报告一致的混合 AI 架构和优雅降级体验

### 1.3 成功标准
- 用户未配置 AI 时，推荐功能 100% 可用
- 推荐理由在 AI 可用时有明显温度提升
- 推荐结果不重复、不打扰核心流程
- 核心逻辑单元测试覆盖 7 个场景

---

## 2. 功能范围

### 2.1 In Scope
- 「清单大全」顶部「为你推荐」横向卡片（3 张）
- 「换一批」刷新功能（每日最多 3 次）
- 「不感兴趣」单条移除与本地记录
- 「我的人生进度」空状态推荐引导
- 本地规则推荐引擎
- AI 润色推荐理由（可选增强）
- LocalStorage 缓存与刷新控制

### 2.2 Out of Scope
- 独立的「发现」Tab
- 社区/UGC 推荐
- 协同过滤或多用户数据
- 推荐理由的机器学习模型训练
- 商业化付费推荐位

---

## 3. 用户场景

### 场景 A：已有一定完成数据的用户
小翅在「旅行」分类下完成了 8 个任务。进入「清单大全」后，顶部推荐卡片区显示：
- 中国城市打卡（旅行相关）
- 人生遗愿清单（人生相关）
- 极限运动挑战（挑战相关）

每张卡片下方显示推荐理由：「旅行是你最近最投入的方向，这份清单也许能给你新灵感。」

### 场景 B：新用户/空状态
小翅刚注册，人生进度里只有默认清单且没有完成任何任务。进入「进度」页面时，空状态下方显示：「人生清单很长，从「人生遗愿清单」开始探索吧。」点击后跳转到「清单大全」。

### 场景 C：AI 增强用户
小翅配置了 Kimi API Key。推荐卡片的理由从模板文案变成 AI 润色后的自然语言：「你最近完成了不少旅行目标，这份「中国城市打卡」应该很对你的胃口 ✨」。

---

## 4. 架构设计

### 4.1 模块划分

| 文件 | 类型 | 职责 |
|------|------|------|
| `js/recommendations.js` | 新增 | 推荐引擎核心：数据聚合、规则打分、理由生成、缓存管理 |
| `js/templates.js` | 修改 | 在大全页渲染推荐区域 |
| `js/custom.js` | 修改 | 在进度空状态渲染推荐引导 |
| `js/aiService.js` | 扩展 | 新增 `generateRecommendationReason()` |
| `index.html` | 修改 | 新增 recommendations 容器 |
| `css/style.css` | 修改 | 推荐卡片、横向滚动、按钮样式 |
| `test/recommendations-test.cjs` | 新增 | 单元测试 |

### 4.2 依赖关系

```
recommendations.js
  ├── storage.js（读取用户数据）
  ├── data.js（读取 TEMPLATE_LIBRARY）
  ├── aiService.js（可选润色）
  └── 不依赖 UI 模块（纯函数为主）

templates.js
  └── recommendations.js（获取推荐列表并渲染）

custom.js
  └── recommendations.js（空状态时获取轻量推荐）
```

---

## 5. 推荐算法

### 5.1 输入信号

从 `StorageManager` 获取：

| 信号 | 来源 | 用途 |
|------|------|------|
| completedByCategory | 已完成任务按分类统计 | 识别用户偏好方向 |
| activeLists | 用户已添加清单 | 避免重复推荐、识别当前阶段 |
| userLevel | 等级数据 | 年龄/阶段加权（可选） |
| streak | 连续打卡数据 | 高打卡用户推荐挑战类清单 |
| addedTemplates | 已添加模板 ID 列表 | 过滤已添加 |
| birthDate | 出生日期 | 计算人生阶段（可选） |

### 5.2 打分公式

对每个候选模板 `t`（`TEMPLATE_LIBRARY` 中未添加的模板）：

```text
score(t) = completedInSameCategory(t) * 2
         + completedInRelatedCategory(t) * 1
         + activeSameCategory(t) * 1.5
         + lifeStageMatch(t) * 1
         + diversityPenalty(t)
```

其中：
- `completedInSameCategory`：用户在该模板分类下已完成的任务数
- `completedInRelatedCategory`：用户在相关分类下已完成的任务数
- `activeSameCategory`：用户当前进行中同分类清单数
- `lifeStageMatch`：基于年龄/人生阶段的匹配度（0 或 1）
- `diversityPenalty`：如果该分类在最近一次推荐中已出现，得分 × 0.6

### 5.3 相关分类映射

```js
const RELATED_CATEGORIES = {
  '旅行': ['人生', '挑战', '美食'],
  '阅读': ['成长', '人生'],
  '情感': ['人生', '体验'],
  '美食': ['旅行', '人生'],
  '影视': ['人生', '体验'],
  '音乐': ['人生', '体验'],
  '挑战': ['旅行', '人生'],
  '人生': ['旅行', '体验', '挑战']
};
```

### 5.4 输出

返回 Top 3 推荐项，每项包含：

```js
{
  templateId: 'china_cities',
  reason: '旅行是你最近最投入的方向，这份清单也许能给你新灵感。',
  source: 'rule' // 或 'api'
}
```

---

## 6. 推荐理由生成

### 6.1 本地规则理由模板

根据用户上下文选择模板：

| 条件 | 理由模板 |
|------|---------|
| 某分类完成任务最多 | 「${category}」是你最近最投入的方向，这份清单也许能给你新灵感。 |
| 完成任务总数 ≤ 3 | 人生清单很长，从这一份开始探索吧。 |
| 连续打卡 ≥ 7 天 | 坚持打卡的你，值得一份新的挑战。 |
| 有相关分类完成记录 | 既然你喜欢${related}，不妨试试这份${category}清单。 |
| 人生阶段匹配 | 适合${stage}阶段的一份${category}清单。 |

### 6.2 AI 润色

扩展 `aiService.js`：

```js
async generateRecommendationReason(baseReason, template, userContext) {
  const cfg = SettingsManager.getAIConfig();
  if (!cfg.enabled || !cfg.apiKey) {
    return { source: 'rule', text: baseReason };
  }

  const prompt = [
    '你是一位温暖的人生记录助手。请把下面这条推荐理由改得更自然、更有温度，25-35 字以内，不要改变原意，不要加标题。',
    `推荐理由：「${baseReason}」`,
    `推荐清单：${template.title}（${template.category}）`
  ].join('\n');

  try {
    const result = await this.callRealAPIWithPrompt(prompt, cfg);
    return { source: 'api', text: result };
  } catch (e) {
    return { source: 'rule', text: baseReason, degraded: true };
  }
}
```

### 6.3 润色策略

- 只润色理由，不推荐清单（保证推荐逻辑可控）
- AI 失败/未配置时自动降级为规则理由
- 不阻塞渲染：先展示规则理由，API 返回后平滑替换
- 润色结果不缓存，每次重新生成

---

## 7. 数据流

```text
用户进入「清单大全」
    ↓
TemplateManager.renderTemplateLibrary()
    ↓
RecommendationEngine.getRecommendations({ limit: 3 })
    ↓
读取 recommendationsCache
    ↓
缓存有效（date === 今天，且 items 非空）
    → 直接返回缓存 items
    ↓
缓存无效
    → 聚合用户数据
    → 本地规则打分
    → 取 Top 3
    → 如 AI 可用，并发润色推荐理由
    → 写入 recommendationsCache
    ↓
渲染横向卡片
    ↓
用户点击「换一批」
    → refreshCount < 3 时重新生成并更新缓存
    → refreshCount >= 3 时禁用按钮
    ↓
用户点击「不感兴趣」
    → 从当前 items 移除
    → templateId 写入 disliked 列表
    → 该模板未来不再参与推荐
```

---

## 8. 缓存设计

### 8.1 LocalStorage Key

```json
{
  "recommendationsCache": {
    "date": "2026-06-27",
    "items": [
      { "templateId": "china_cities", "reason": "...", "source": "rule" },
      { "templateId": "douban_top250", "reason": "...", "source": "api" },
      { "templateId": "world_food", "reason": "...", "source": "rule" }
    ],
    "refreshCount": 1,
    "disliked": ["music_100", "books_100"]
  }
}
```

### 8.2 缓存策略

- 每日首次生成后写入缓存
- 用户点击「换一批」时更新缓存并递增 `refreshCount`
- 跨日期自动清空 `refreshCount` 和 `disliked`
- 用户清空不感兴趣时，可重新推荐对应模板
- LocalStorage 写入失败时降级为不缓存

---

## 9. UI 设计

### 9.1 「为你推荐」区域

位置：「清单大全」分类导航下方。

结构：

```html
<section class="recommendations-section">
  <div class="recommendations-header">
    <h3>🎯 为你推荐</h3>
    <button id="refresh-recommendations" class="text-btn">换一批 ↻</button>
  </div>
  <div class="recommendations-scroll">
    <!-- 卡片 1 -->
    <!-- 卡片 2 -->
    <!-- 卡片 3 -->
  </div>
</section>
```

### 9.2 推荐卡片

尺寸：宽 260px，高 auto，横向排列，间距 12px。

内容：

```
┌─────────────────────────────┐
│ 🗺️  旅行                 ×   │
│                             │
│   中国城市打卡              │
│                             │
│ 旅行是你最近最投入的        │
│ 方向，这份清单也许能...     │
│                             │
│   [查看详情 →]              │
└─────────────────────────────┘
```

### 9.3 空状态引导

当「我的人生进度」中清单数量 ≤ 1 时：

```html
<div class="empty-recommendations">
  <p>不知道做什么？从「人生遗愿清单」开始探索吧。</p>
  <button class="primary-btn" onclick="App.switchTab('templates')">
    去发现更多清单
  </button>
</div>
```

---

## 10. 交互设计

| 操作 | 反馈 |
|------|------|
| 点击卡片 | 进入清单预览/详情页（复用现有模板详情逻辑） |
| 点击「×」 | 卡片淡出移除，记录不感兴趣 |
| 点击「换一批」 | 重新生成，刷新次数 +1，每日最多 3 次 |
| 滑动到最右 | 显示「查看更多清单」提示 |
| 刷新次数用完 | 「换一批」按钮禁用，tooltip：「明天再来」 |
| 推荐为空 | 显示「暂时没灵感，去大全看看吧」 |

---

## 11. 错误处理

| 场景 | 处理 |
|------|------|
| AI API 超时/失败 | 使用规则理由，标记 `degraded: true`，不在 UI 报错 |
| 未配置 AI | 完全走本地规则 |
| 推荐列表为空 | 显示友好空状态 |
| LocalStorage 写入失败 | 降级为不缓存 |
| 刷新次数超限 | 禁用按钮并提示 |
| 用户数据异常 | 返回默认推荐（人生遗愿清单、中国城市打卡、100本高质量必读书单） |

---

## 12. 测试计划

新增 `test/recommendations-test.cjs`，覆盖以下场景：

1. **规则打分正确性**：给定用户数据，预期模板排第一
2. **已添加过滤**：不会推荐用户已添加的模板
3. **多样性惩罚**：同一分类不会连续霸榜
4. **推荐理由生成**：不同上下文生成对应文案
5. **AI 降级**：API 失败时返回规则版本
6. **缓存命中**：同日缓存直接返回，跨日重新生成
7. **不感兴趣**：disliked 的模板不再出现

---

## 13. 实现顺序

1. 创建 `js/recommendations.js` 推荐引擎
2. 扩展 `js/aiService.js` 增加推荐理由润色
3. 修改 `index.html` 增加推荐容器
4. 修改 `js/templates.js` 渲染推荐区域
5. 修改 `js/custom.js` 渲染空状态引导
6. 修改 `css/style.css` 增加推荐样式
7. 新增 `test/recommendations-test.cjs` 单元测试
8. 更新 `README.md` 和 `CHANGELOG.md`

---

## 14. 风险与应对

| 风险 | 应对 |
|------|------|
| 推荐结果不准确 | 保留「不感兴趣」和「换一批」让用户纠正；算法可迭代 |
| AI 调用增加成本 | 只润色理由，不替代推荐；一次最多 3 条 |
| UI 显得杂乱 | 只在大全顶部和空状态出现，不全局打扰 |
| 本地存储膨胀 | 缓存结构精简；disliked 列表定期自动清空 |

---

## 15. 附录：相关分类映射表

```js
const RELATED_CATEGORIES = {
  '旅行': ['人生', '挑战', '美食'],
  '影视': ['人生', '体验'],
  '音乐': ['人生', '体验'],
  '阅读': ['成长', '人生'],
  '美食': ['旅行', '人生'],
  '情感': ['人生', '体验'],
  '挑战': ['旅行', '人生'],
  '人生': ['旅行', '体验', '挑战', '阅读']
};
```

---

**下一步：** 确认本设计文档后，进入实现计划阶段。
