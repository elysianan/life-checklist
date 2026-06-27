/**
 * 余生闹钟 —— 计算引擎（纯逻辑，顶层不碰 DOM）
 */
const LifeClockEngine = {
  // 一年的毫秒数（按 365.25 天）
  MS_PER_YEAR: 365.25 * 24 * 60 * 60 * 1000,

  // 精确年龄（浮点年）。nowMs 为时间戳（毫秒）
  calcAge(birthDateStr, nowMs) {
    const birth = new Date(birthDateStr).getTime();
    return (nowMs - birth) / this.MS_PER_YEAR;
  },

  // 余生事件列表，每项 {emoji, text}
  calcEvents(ctx) {
    const ageYears = this.calcAge(ctx.birthDate, ctx.now);
    const remainingYears = Math.max(0, ctx.lifeExpectancy - Math.floor(ageYears));
    if (remainingYears <= 0) {
      return [{ emoji: '🎁', text: '每一天都是赚到' }];
    }
    const fullCtx = { ...ctx, ageYears, remainingYears };
    const events = ctx.events || LIFE_EVENTS;
    return events.map(ev => {
      const r = ev.calc(remainingYears, fullCtx);
      return typeof r === 'string' ? { emoji: ev.emoji, text: r } : r;
    });
  }
};
