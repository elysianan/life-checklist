/**
 * AI 人生报告模块
 * 负责：数据聚合、报告页渲染、时间段切换、分享
 */
const ReportManager = {
  currentPeriod: 'month', // 当前选中时间段

  /**
   * 把原始数据按时间段聚合成结构化 reportData（纯函数）
   * @param {'month'|'year'|'all'} period
   */
  aggregateReportData(period) {
    const lists = StorageManager.getLists() || DEFAULT_LISTS;
    const range = this._getPeriodRange(period);

    // 1) 遍历所有已完成且在时间段内的任务，按清单分组
    const categoryMap = {};   // title -> { title, emoji, count }
    const dayMap = {};        // 'M-D' -> count
    let totalCompleted = 0;

    lists.forEach(list => {
      list.tasks.forEach(task => {
        if (!task.completed || !task.completedDate) return;
        const done = new Date(task.completedDate + 'T00:00:00');
        if (!this._inRange(done, range)) return;

        totalCompleted++;

        if (!categoryMap[list.title]) {
          categoryMap[list.title] = { title: list.title, emoji: list.emoji, count: 0 };
        }
        categoryMap[list.title].count++;

        const dayKey = (done.getMonth() + 1) + '-' + done.getDate();
        dayMap[dayKey] = (dayMap[dayKey] || 0) + 1;
      });
    });

    const byCategory = Object.values(categoryMap).sort((a, b) => b.count - a.count);
    const topCategory = byCategory.length > 0 ? byCategory[0] : null;

    // 2) 最活跃的一天
    let mostActiveDay = null;
    Object.keys(dayMap).forEach(k => {
      if (!mostActiveDay || dayMap[k] > mostActiveDay.count) {
        mostActiveDay = { label: k, count: dayMap[k] };
      }
    });

    // 3) 累计数据（无时间戳，作为“截至目前”展示）
    const streakData = StorageManager.getStreakData();
    const totalAchievements = StorageManager.getUnlockedAchievements().length;

    // 4) 人生进度
    const lifeProgress = this._calcLifeProgress();

    // 5) 高光时刻：时段内含照片的时间线事件，最多 3 条
    const highlights = StorageManager.getTimeline()
      .filter(e => e.photo && this._inRange(new Date(e.date), range))
      .slice(0, 3)
      .map(e => ({ title: e.title, emoji: e.emoji, photo: e.photo }));

    return {
      period,
      periodLabel: this._getPeriodLabel(period),
      totalCompleted,
      byCategory,
      topCategory,
      streak: { current: streakData.currentStreak, longest: streakData.longestStreak },
      totalAchievements,
      lifeProgress,
      highlights,
      mostActiveDay,
      hasData: totalCompleted > 0
    };
  },

  /** 计算时间段的起止时间 */
  _getPeriodRange(period) {
    const now = new Date();
    if (period === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start, end: now };
    }
    if (period === 'year') {
      const start = new Date(now.getFullYear(), 0, 1);
      return { start, end: now };
    }
    return { start: new Date(2000, 0, 1), end: now }; // all
  },

  _inRange(date, range) {
    return date >= range.start && date <= range.end;
  },

  _getPeriodLabel(period) {
    const now = new Date();
    if (period === 'month') return `${now.getFullYear()} 年 ${now.getMonth() + 1} 月`;
    if (period === 'year') return `${now.getFullYear()} 年`;
    return '全部时光';
  },

  /** 人生进度：年龄、已活天数、百分比 */
  _calcLifeProgress() {
    const birthStr = StorageManager.getBirthDate();
    if (!birthStr) return { age: 0, daysLived: 0, percent: 0 };
    const birth = new Date(birthStr);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
    const daysLived = Math.floor((now - birth) / 86400000);
    const percent = Math.round(StorageManager.calculateLifeProgress(birthStr));
    return { age, daysLived, percent };
  },

  /** 打开报告页（默认本月） */
  open() {
    this.currentPeriod = 'month';
    showReportPage();
    this._bindEventsOnce();
    this._syncTabs();
    this.renderReport();
  },

  /** 绑定一次性事件 */
  _bindEventsOnce() {
    if (this._bound) return;
    this._bound = true;

    document.getElementById('report-back-btn').addEventListener('click', () => showProfilePage());
    document.getElementById('report-regenerate-btn').addEventListener('click', () => this.renderReport());
    document.getElementById('report-save-btn').addEventListener('click', () => this._saveImage());
    document.getElementById('report-copy-btn').addEventListener('click', () => this._copyText());

    document.querySelectorAll('#report-period-tabs .report-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.currentPeriod = tab.dataset.period;
        this._syncTabs();
        this.renderReport();
      });
    });
  },

  _syncTabs() {
    document.querySelectorAll('#report-period-tabs .report-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.period === this.currentPeriod);
    });
  },

  /** 聚合 + 生成文案 + 渲染（异步） */
  async renderReport() {
    const card = document.getElementById('report-card');
    const loading = document.getElementById('report-loading');
    const data = this.aggregateReportData(this.currentPeriod);

    // 空数据引导
    if (!data.hasData) {
      card.innerHTML = `
        <div class="report-empty">
          <span class="empty-emoji">🌱</span>
          <p>这个时段还没有完成记录<br>去完成第一个目标，开启你的人生报告吧</p>
        </div>`;
      this._lastText = '';
      return;
    }

    loading.classList.remove('hidden');
    card.innerHTML = '';

    let narrative;
    try {
      narrative = await AIService.generateNarrative(data);
    } catch (e) {
      narrative = AIService.callRuleEngine(data);
    }
    loading.classList.add('hidden');

    if (narrative.degraded) {
      ShareManager.showToast('AI 服务暂不可用，已使用本地报告');
    }

    card.innerHTML = this._buildCardHTML(data, narrative);
    this._lastText = this._plainText(data, narrative);
  },

  /** 拼装报告卡片 HTML */
  _buildCardHTML(d, narrative) {
    // 文案：API 返回整段 text；规则引擎返回 paragraphs[]
    const paras = narrative.source === 'api'
      ? narrative.text.split('\n').filter(s => s.trim())
      : narrative.paragraphs;
    const narrativeHTML = paras.map(p => `<p>${p}</p>`).join('');

    const maxCat = d.byCategory.length ? d.byCategory[0].count : 1;
    const catHTML = d.byCategory.map(c => `
      <div class="report-cat-row">
        <span class="report-cat-name">${c.emoji} ${c.title}</span>
        <span class="report-cat-bar-bg"><span class="report-cat-bar" style="width:${Math.round(c.count / maxCat * 100)}%"></span></span>
        <span class="report-cat-count">${c.count}</span>
      </div>`).join('');

    const highlightsHTML = d.highlights.length ? `
      <div class="report-section-title">高光时刻</div>
      <div class="report-highlights">
        ${d.highlights.map(h => `<div class="report-highlight"><img src="${h.photo}" alt=""><span>${h.title}</span></div>`).join('')}
      </div>` : '';

    return `
      <div class="report-card-title">${d.lifeProgress.age > 0 ? d.lifeProgress.age + ' 岁 · ' : ''}我的人生报告</div>
      <div class="report-card-period">${d.periodLabel}</div>
      <div class="report-narrative">${narrativeHTML}</div>
      <div class="report-metrics">
        <div class="report-metric"><div class="report-metric-value">${d.totalCompleted}</div><div class="report-metric-label">完成事项</div></div>
        <div class="report-metric"><div class="report-metric-value">${d.streak.current}</div><div class="report-metric-label">连续打卡</div></div>
        <div class="report-metric"><div class="report-metric-value">${d.lifeProgress.percent}%</div><div class="report-metric-label">人生进度</div></div>
      </div>
      <div class="report-section-title">分类洞察</div>
      ${catHTML}
      ${highlightsHTML}
      <div class="report-card-footer">
        <span>人生已完成清单</span>
        <span>${this._todayStr()}</span>
      </div>`;
  },

  _todayStr() {
    const n = new Date();
    return `${n.getFullYear()}-${n.getMonth() + 1}-${n.getDate()}`;
  },

  /** 生成可复制的纯文本 */
  _plainText(d, narrative) {
    const body = narrative.source === 'api' ? narrative.text : narrative.paragraphs.join('\n');
    return `我的人生报告 · ${d.periodLabel}\n\n${body}\n\n完成 ${d.totalCompleted} 件事 · 连续打卡 ${d.streak.current} 天 · 人生进度 ${d.lifeProgress.percent}%\n\n#人生已完成清单`;
  },

  /** 保存为图片：复用 ShareManager 的 html2canvas 截图 */
  _saveImage() {
    const card = document.getElementById('report-card');
    if (!card || !card.innerHTML.trim()) return;
    if (!window.html2canvas) {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
      s.onload = () => this._capture(card);
      document.head.appendChild(s);
    } else {
      this._capture(card);
    }
  },

  _capture(el) {
    html2canvas(el, { backgroundColor: '#ffffff', scale: 2, useCORS: true }).then(canvas => {
      const link = document.createElement('a');
      link.download = '人生报告_' + new Date().toISOString().slice(0, 10) + '.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
      ShareManager.showToast('图片已保存 ✅');
    });
  },

  _copyText() {
    if (!this._lastText) return;
    navigator.clipboard.writeText(this._lastText)
      .then(() => ShareManager.showToast('已复制到剪贴板 ✅'))
      .catch(() => ShareManager.showToast('复制失败，请手动选择'));
  },

  /**
   * 【开发/演示用】一键填充示例数据，便于录屏展示报告效果。
   * 控制台执行 ReportManager.fillDemoData() 后页面会刷新。
   */
  fillDemoData() {
    const today = new Date();
    const iso = (offsetDays) => {
      const d = new Date(today.getTime() - offsetDays * 86400000);
      return d.toISOString().split('T')[0];
    };
    const lists = [
      { id:'travel', emoji:'🌍', title:'环游世界', description:'探索星球的每个角落', color:'#007AFF', category:'旅行',
        tasks:[
          { id:'t1', text:'看一次极光', completed:true, completedDate: iso(2), note:'', priority:'medium' },
          { id:'t2', text:'去一次巴黎', completed:true, completedDate: iso(5), note:'', priority:'medium' },
          { id:'t3', text:'坐一次热气球', completed:true, completedDate: iso(2), note:'', priority:'medium' },
          { id:'t4', text:'潜水看珊瑚', completed:false, completedDate:'', note:'', priority:'medium' }
        ]},
      { id:'skills', emoji:'🎯', title:'技能解锁', description:'掌握想学的技能', color:'#FF9500', category:'成长',
        tasks:[
          { id:'s1', text:'学会弹吉他', completed:true, completedDate: iso(8), note:'', priority:'medium' },
          { id:'s2', text:'学会游泳', completed:true, completedDate: iso(12), note:'', priority:'medium' }
        ]},
      { id:'life', emoji:'❤️', title:'人生体验', description:'值得铭记的时刻', color:'#FF2D55', category:'体验',
        tasks:[
          { id:'l1', text:'看一次日出', completed:true, completedDate: iso(1), note:'', priority:'medium' }
        ]}
    ];
    StorageManager.setLists(lists);
    StorageManager.setStreakData({ currentStreak: 6, longestStreak: 14, lastCheckDate: today.toDateString(), todayChecked: true });
    if (!StorageManager.getBirthDate()) StorageManager.setBirthDate('1996-05-20');
    StorageManager.checkAchievements();
    window.location.reload();
  }
};
