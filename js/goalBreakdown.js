/**
 * AI 目标拆解引擎
 * 纯逻辑，不依赖 DOM
 */
const GoalBreakdownEngine = {
  // 关键词 → 类型/分类/emoji/模板
  GOAL_TYPES: {
    reading: {
      keywords: ['读书', '看书', '阅读', '书'],
      category: '阅读',
      emoji: '📚',
      build: (goalText, duration) => ({
        phases: [
          { title: '打基础', tasks: ['列出15本目标书单', '每天固定30分钟阅读'] },
          { title: '推进提速', tasks: ['每月读完规定数量', '写读书笔记或书评'] },
          { title: '冲刺收尾', tasks: ['补齐未读书目', '做年度阅读复盘'] }
        ]
      })
    },
    fitness: {
      keywords: ['健身', '减肥', '跑步', '运动', '马拉松'],
      category: '挑战',
      emoji: '💪',
      build: (goalText, duration) => ({
        phases: [
          { title: '建立习惯', tasks: ['制定每周运动计划', '找到固定运动时间'] },
          { title: '稳步提升', tasks: ['逐步增加运动量', '记录身体数据变化'] },
          { title: '挑战目标', tasks: ['完成阶段性测试', '复盘并制定下一阶段计划'] }
        ]
      })
    },
    language: {
      keywords: ['英语', '外语', '口语', '日语', '雅思', '托福', '韩语', '法语', '德语'],
      category: '成长',
      emoji: '🗣️',
      build: (goalText, duration) => ({
        phases: [
          { title: '基础积累', tasks: ['每天背单词或短语', '学习核心语法'] },
          { title: '输入输出', tasks: ['每天听力输入30分钟', '每周开口练习3次'] },
          { title: '实战冲刺', tasks: ['模拟真实场景对话', '做阶段性测试或考试'] }
        ]
      })
    },
    skill: {
      keywords: ['学', '技能', '吉他', '编程', '画画', '乐器', '摄影', '游泳', '烹饪', '烘焙'],
      category: '成长',
      emoji: '🎯',
      build: (goalText, duration) => ({
        phases: [
          { title: '入门打基础', tasks: ['准备学习资料或工具', '每天练习基础动作'] },
          { title: '专项提升', tasks: ['完成一个小作品', '针对弱项刻意练习'] },
          { title: '成果输出', tasks: ['完成一个完整作品', '复盘学习路径'] }
        ]
      })
    },
    travel: {
      keywords: ['旅行', '环游', '去', '打卡', '城市'],
      category: '旅行',
      emoji: '✈️',
      build: (goalText, duration) => ({
        phases: [
          { title: '规划准备', tasks: ['确定目的地清单', '制定预算和出行时间'] },
          { title: '分批执行', tasks: ['完成第一批出行', '记录旅行见闻'] },
          { title: '收官复盘', tasks: ['完成剩余目标地', '整理旅行回忆'] }
        ]
      })
    },
    food: {
      keywords: ['美食', '做饭', '烘焙', '料理', '做菜'],
      category: '美食',
      emoji: '🍜',
      build: (goalText, duration) => ({
        phases: [
          { title: '工具与基础', tasks: ['准备必要厨具或食材', '学习5道基础菜'] },
          { title: '扩展菜单', tasks: ['每周尝试新菜品', '记录成功食谱'] },
          { title: '形成风格', tasks: ['做一桌完整家宴', '整理个人食谱集'] }
        ]
      })
    },
    finance: {
      keywords: ['存钱', '理财', '投资', '攒钱', '储蓄'],
      category: '人生',
      emoji: '💰',
      build: (goalText, duration) => ({
        phases: [
          { title: '理清现状', tasks: ['梳理收入与支出', '设定具体金额目标'] },
          { title: '执行计划', tasks: ['每月固定储蓄', '学习基础理财知识'] },
          { title: '复盘调整', tasks: ['检查目标进度', '优化资产配置'] }
        ]
      })
    }
  },

  // 通用四步法兜底
  _buildGenericRoadmap(goalText, duration) {
    return {
      phases: [
        { title: '明确与准备', tasks: ['把目标写清楚', '了解需要什么资源', '列出第一步行动'] },
        { title: '分阶段执行', tasks: ['拆成可每周推进的小任务', '定期记录进展', '保持节奏不掉队'] },
        { title: '复盘与冲刺', tasks: ['检查整体进度', '调整方法', '完成收尾并庆祝'] }
      ]
    };
  },

  /**
   * 关键词匹配目标类型（纯函数）
   * @returns {{type:string,category:string,emoji:string}|null}
   */
  classifyGoal(goalText) {
    const text = goalText.toLowerCase();
    for (const [type, config] of Object.entries(this.GOAL_TYPES)) {
      if (config.keywords.some(k => text.includes(k))) {
        return { type, category: config.category, emoji: config.emoji };
      }
    }
    return null;
  },

  /**
   * 根据期限生成阶段时间标签
   */
  _buildTimeLabels(duration) {
    if (duration === '3个月') return ['第1个月', '第2个月', '第3个月'];
    if (duration === '6个月') return ['第1-2个月', '第3-4个月', '第5-6个月'];
    if (duration === '1年') return ['第1-3个月', '第4-8个月', '第9-12个月'];
    return ['', '', ''];
  },

  /**
   * 本地模板库生成路线图（纯函数，零依赖）
   * @returns {{source:'rule',goal:string,duration:string,category:string,emoji:string,phases:Array,degraded:boolean}}
   */
  buildLocalRoadmap(goalText, duration) {
    const classified = this.classifyGoal(goalText);
    const timeLabels = this._buildTimeLabels(duration);
    const sourcePlan = classified
      ? this.GOAL_TYPES[classified.type].build(goalText, duration)
      : this._buildGenericRoadmap(goalText, duration);

    const phases = sourcePlan.phases.map((p, i) => ({
      title: p.title,
      timeLabel: timeLabels[i] || '',
      tasks: p.tasks.slice(0, 4)
    }));

    return {
      source: 'rule',
      goal: goalText,
      duration,
      category: classified ? classified.category : '自定义',
      emoji: classified ? classified.emoji : '🎯',
      phases,
      degraded: false
    };
  },

  /**
   * 构建给大模型的 prompt（要求只返回 JSON）
   */
  buildPrompt(goalText, duration) {
    return [
      '你是一位温暖、务实的人生目标规划师。请将用户的目标拆解成 3 个阶段的执行路线图。',
      '要求：',
      '1. 只返回纯 JSON，不要任何解释、不要 markdown 代码块；',
      '2. JSON 格式：{ "goal": "用户目标", "duration": "期限", "category": "分类", "phases": [{ "title": "阶段标题", "timeLabel": "时间段", "tasks": ["任务1", "任务2"] }] }；',
      '3. category 只能从「旅行、阅读、成长、美食、影视、音乐、挑战、人生、情感、体验、自定义」中选择一个最贴近的；',
      '4. 每阶段 2-4 个任务，任务用动宾短语，具体可执行；',
      '5. timeLabel 按期限填写，如「第1-3个月」「第4-8个月」「第9-12个月」。',
      '',
      `用户目标：${goalText}`,
      `期限：${duration}`
    ].join('\n');
  },

  /**
   * 统一入口：有 Key 调 AI，失败或无 Key 降级本地
   */
  async generateRoadmap(goalText, duration) {
    const cfg = SettingsManager.getAIConfig();
    if (!cfg.enabled || !cfg.apiKey) {
      return this.buildLocalRoadmap(goalText, duration);
    }
    try {
      const roadmap = await AIService.generateGoalRoadmap(goalText, duration);
      return roadmap;
    } catch (e) {
      console.warn('AI 目标拆解失败，降级本地引擎:', e.message);
      const local = this.buildLocalRoadmap(goalText, duration);
      local.degraded = true;
      return local;
    }
  },

  /**
   * 将路线图落地为专属清单（写入 Storage，返回新清单；不刷新 UI）
   */
  createListFromRoadmap(roadmap) {
    const lists = StorageManager.getLists() || [];
    const stamp = Date.now();
    const colorMap = {
      '旅行': '#34C759',
      '阅读': '#AF52DE',
      '成长': '#FF9500',
      '美食': '#FF9500',
      '影视': '#5856D6',
      '音乐': '#5AC8FA',
      '挑战': '#FF3B30',
      '人生': '#FF9500',
      '情感': '#FF2D55',
      '体验': '#FF2D55',
      '自定义': '#5E5CE6'
    };

    const newList = {
      id: 'goal_' + stamp,
      emoji: roadmap.emoji || '🎯',
      title: roadmap.goal,
      description: (roadmap.duration || '自定义期限') + ' · AI 目标路线图',
      color: colorMap[roadmap.category] || '#5E5CE6',
      category: roadmap.category || '自定义',
      isCustom: true,
      fromGoal: true,
      tasks: roadmap.phases.flatMap((p, pi) =>
        p.tasks.map((t, ti) => ({
          id: `task_${stamp}_${pi}_${ti}`,
          text: `阶段${pi + 1}·${t}`,
          completed: false,
          completedDate: '',
          note: '',
          priority: 'medium'
        }))
      )
    };

    lists.push(newList);
    StorageManager.setLists(lists);
    return newList;
  }
};
