# 人生已完成清单 ✨

![version](https://img.shields.io/badge/version-v6.7.0-blue)

一款极简风格的人生清单 Web App，帮助你记录、追踪并珍惜人生中想完成的每一件事，并把「人生倒计时」的焦虑重塑为对余生的珍惜。

## 🎯 核心概念（5 Tab）

- **HOME** - 我的人生清单：打开即见的清单卡片，左上 ⏰ 进「余生闹钟」，长按拖动排序
- **清单** - 清单大全：丰富的预设模板库 + AI 目标拆解入口
- **人生轴** - 手动大事记：记录人生重要事件，单列/双侧时间线，可分享
- **人生进度** - 多人物进度：给自己和家人朋友各建一条人生进度条
- **我的** - 个人中心：等级、成就、AI 报告、统计、设置

> 二级页面：余生闹钟（首页 ⏰ 进入）、清单详情（网格标签打卡）、人生进度编辑等

## 🛠️ 技术栈

- HTML5 + Tailwind CSS + 原生 JavaScript
- Chart.js（图表）、html2canvas（分享图）
- LocalStorage（数据持久化）
- 零第三方框架，滚轮 / 拖拽 / 长按均原生实现

## 🚀 快速开始

1. 下载或克隆项目
2. 双击 `index.html`，或用 VS Code Live Server / `python -m http.server`
3. 在浏览器中打开即可使用

## 📁 项目结构

```
life-checklist/
├── index.html
├── css/style.css
├── js/
│   ├── data.js            # 预设数据与清单模板
│   ├── storage.js         # LocalStorage 管理
│   ├── app.js             # 主应用逻辑 + 视图路由 showView
│   ├── animations.js      # 动画
│   ├── sounds.js          # 音效
│   ├── settings.js        # 设置
│   ├── share.js           # 分享 / 截图
│   ├── profile.js         # 个人中心
│   ├── custom.js          # 自定义清单
│   ├── search.js          # 搜索
│   ├── taskDetail.js      # 任务详情
│   ├── templates.js       # 清单大全
│   ├── timeline.js        # 人生轴（手动大事记）
│   ├── lifeProgress.js    # 人生进度（多人物）
│   ├── lifeClock.js       # 余生闹钟
│   ├── datePicker.js      # 三列滚轮日期选择（弹出 / 内联）
│   ├── statistics.js      # 数据统计
│   ├── aiService.js       # AI 文案生成层
│   ├── report.js          # AI 人生报告
│   ├── goalBreakdown.js   # AI 目标拆解引擎
│   └── goalBreakdownUI.js # AI 目标拆解 UI
└── test/                  # 纯 Node 单元测试（136 通过）
```

## ✨ 功能特性

### HOME · 我的人生清单
- 彩色色条清单卡片，长按拖动排序
- 今日格言；左上 ⏰ 进入余生闹钟

### 清单详情 · 网格标签
- 轻点标签即打卡（变色 + 音效 + 撒花，首页进度联动）
- 长按进任务详情；主题配色 / 生成图片 / 移除清单

### 清单大全
- 8 大类 500+ 预设清单（城市 / 电影 / 书 / 歌 / 美食 / 情侣 / 极限 / 遗愿…）
- AI 智能推荐 + AI 目标拆解（输入目标 → 3 阶段路线图 → 专属清单）

### 人生进度（多人物）
- 称呼 + 已活整岁 / 目标寿命 + 进度条
- 「我」与余生闹钟生日 / 寿命同源
- 内联滚轮选生日、主题色

### 人生轴 · 手动大事记
- 手动添加 / 编辑 / 删除人生事件，按年份排序
- 单列 / 双侧布局切换；分享卡导出

### 余生闹钟
- iOS 风格表盘 + 实时年龄 + 余生网格（还能看几届世界杯 / 几个夏天）
- 滑动选生日，退休年龄与预期寿命设置

### 其他
- 成就徽章、数据统计、AI 人生报告（本地规则 + 可选大模型）
- 深色模式、音效反馈、移动端适配

## 📚 作品集文档

- 产品经理作品集：[portfolio.md](./portfolio.md)
- 简历项目描述：[resume_project.md](./resume_project.md)

## 📄 许可证

MIT License
