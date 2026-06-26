/**
 * AI 文案生成服务
 * 混合策略：默认规则引擎，可选真实大模型 API，失败自动降级
 */
const AIService = {
  /**
   * 本地规则引擎：根据 reportData 生成 4 段中文文案（纯函数）
   * @returns {{source:'rule', paragraphs:string[]}}
   */
  callRuleEngine(reportData) {
    const d = reportData;
    const pick = (arr, seed) => arr[seed % arr.length]; // 用数据做种子，稳定又多样

    // 第 1 段：开场总结
    const openings = [
      `在${d.periodLabel}里，你完成了 ${d.totalCompleted} 件事，每一件都是生活的勋章。`,
      `回顾${d.periodLabel}，你郑重地完成了 ${d.totalCompleted} 个目标，了不起。`,
      `${d.periodLabel}的你，把 ${d.totalCompleted} 个想法变成了现实。`
    ];
    const p1 = pick(openings, d.totalCompleted);

    // 第 2 段：亮点（最活跃分类 / 高光）
    let p2;
    if (d.topCategory) {
      p2 = `其中「${d.topCategory.emoji} ${d.topCategory.title}」最为活跃，完成了 ${d.topCategory.count} 件——看得出这是你当下热爱的方向。`;
      if (d.mostActiveDay) {
        p2 += ` ${d.mostActiveDay.label} 那天你尤其投入，一口气完成了 ${d.mostActiveDay.count} 件事。`;
      }
    } else {
      p2 = '新的篇章正等待被书写，去完成第一个属于这个阶段的目标吧。';
    }

    // 第 3 段：坚持鼓励（打卡）
    const streakLines = [
      `你已连续打卡 ${d.streak.current} 天，最高纪录 ${d.streak.longest} 天，坚持本身就是一种天赋。`,
      `当前连续打卡 ${d.streak.current} 天（历史最高 ${d.streak.longest} 天），好习惯正在塑造更好的你。`
    ];
    const p3 = d.streak.longest > 0
      ? pick(streakLines, d.streak.longest)
      : '从今天开始连续打卡，让坚持成为习惯吧。';

    // 第 4 段：下一步建议
    const suggestions = [
      '下一步，不妨给自己定一个稍有挑战的小目标，跳一跳够得着的那种。',
      '接下来，试着把一个搁置已久的愿望提上日程吧——未来的你会感谢现在的行动。',
      '继续保持节奏，挑一件让你心动已久的事，把它加入清单。'
    ];
    const p4 = pick(suggestions, d.totalCompleted + d.streak.longest);

    return { source: 'rule', paragraphs: [p1, p2, p3, p4] };
  },

  /**
   * 统一入口：有有效配置则调真实 API，否则/失败则降级规则引擎
   */
  async generateNarrative(reportData) {
    const cfg = SettingsManager.getAIConfig();
    if (cfg.enabled && cfg.apiKey) {
      try {
        const apiResult = await this.callRealAPI(reportData, cfg);
        return apiResult; // { source:'api', text }
      } catch (e) {
        console.warn('真实 API 调用失败，降级规则引擎:', e.message);
        const fallback = this.callRuleEngine(reportData);
        fallback.degraded = true; // 标记降级，UI 可提示
        return fallback;
      }
    }
    return this.callRuleEngine(reportData);
  },

  /**
   * 把 reportData 组织成给大模型的中文 prompt
   */
  buildPrompt(reportData) {
    const d = reportData;
    const cats = d.byCategory.map(c => `${c.title}(${c.count}件)`).join('、') || '暂无';
    return [
      '你是一位温暖、真诚的人生记录助手。请根据以下用户数据，写一段 150-250 字的中文「人生阶段报告」。',
      '要求：口吻温暖个性化、有具体数据支撑、给出一个具体的下一步建议；不要用 markdown 标题，分 2-3 个自然段。',
      '',
      `统计时段：${d.periodLabel}`,
      `完成事项总数：${d.totalCompleted}`,
      `分类分布：${cats}`,
      `最活跃方向：${d.topCategory ? d.topCategory.title : '无'}`,
      `连续打卡：当前 ${d.streak.current} 天 / 最高 ${d.streak.longest} 天`,
      `已解锁成就：${d.totalAchievements} 个`,
      `人生进度：${d.lifeProgress.age} 岁，已度过 ${d.lifeProgress.daysLived} 天`
    ].join('\n');
  },

  /**
   * 调用真实大模型（OpenAI 兼容），15s 超时
   * 注意：浏览器前端直连时，部分厂商可能因 CORS 跨域策略拒绝请求，
   *       此时会抛错并由 generateNarrative 自动降级到规则引擎。
   * @returns {Promise<{source:'api', text:string}>}
   */
  async callRealAPI(reportData, config) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const resp = await fetch(`${config.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: 'system', content: '你是一位温暖、真诚的人生记录助手。' },
            { role: 'user', content: this.buildPrompt(reportData) }
          ],
          temperature: 0.8
        }),
        signal: controller.signal
      });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const data = await resp.json();
      const text = data.choices && data.choices[0] && data.choices[0].message
        ? data.choices[0].message.content.trim()
        : '';
      if (!text) throw new Error('空响应');
      return { source: 'api', text };
    } finally {
      clearTimeout(timer);
    }
  },

  /**
   * 测试连接：用最小请求验证 Key 是否可用
   */
  async testConnection(config) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const resp = await fetch(`${config.baseURL}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
        body: JSON.stringify({ model: config.model, messages: [{ role: 'user', content: '你好' }], max_tokens: 5 }),
        signal: controller.signal
      });
      if (resp.ok) return { ok: true, message: '连接成功 ✅' };
      if (resp.status === 401) return { ok: false, message: 'API Key 无效（401）' };
      return { ok: false, message: '连接失败：HTTP ' + resp.status };
    } catch (e) {
      return { ok: false, message: e.name === 'AbortError' ? '连接超时' : ('网络错误：' + e.message) };
    } finally {
      clearTimeout(timer);
    }
  },

  /**
   * 调用真实大模型处理自定义 prompt（OpenAI 兼容）
   * 15 秒超时
   */
  async callRealAPIWithPrompt(prompt, config) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const resp = await fetch(`${config.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: 'system', content: '你是一位温暖、真诚的人生记录助手。' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.8,
          max_tokens: 80
        }),
        signal: controller.signal
      });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const data = await resp.json();
      const text = data.choices && data.choices[0] && data.choices[0].message
        ? data.choices[0].message.content.trim()
        : '';
      if (!text) throw new Error('空响应');
      return text;
    } finally {
      clearTimeout(timer);
    }
  },

  /**
   * 润色推荐理由
   * @returns {{source:'rule'|'api', text:string, degraded?:boolean}}
   */
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
      const text = await this.callRealAPIWithPrompt(prompt, cfg);
      return { source: 'api', text };
    } catch (e) {
      console.warn('AI 润色推荐理由失败，降级规则引擎:', e.message);
      return { source: 'rule', text: baseReason, degraded: true };
    }
  }
};
