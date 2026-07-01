/**
 * 人生轴模块（手动大事记）
 * 纯逻辑与渲染分离：TimelineEngine + TimelineManager
 */

// ==================== 纯逻辑引擎 ====================
const TimelineEngine = {
  /**
   * 一次性迁移：旧结构 {id, date, title, ...} → 新 {id, year, month, text}
   * 过滤无合法 date 或 title 的脏数据
   */
  migrate(oldArr) {
    if (!Array.isArray(oldArr)) return [];
    let seq = 1;
    return oldArr.reduce((acc, item) => {
      if (!item || typeof item !== 'object') return acc;
      const dateVal = item.date;
      const titleVal = item.title;
      if (!dateVal || !titleVal) return acc;
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return acc;
      acc.push({
        id: 'e_' + (seq++),
        year: d.getFullYear(),
        month: d.getMonth() + 1, // 从旧 date 恢复月份；新数据直接带 month
        text: String(titleVal)
      });
      return acc;
    }, []);
  },

  /**
   * 按年份升序、同年按月份升序排序，返回新数组，不修改原数组
   */
  sortByYear(events) {
    if (!Array.isArray(events)) return [];
    return [...events].sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return (a.month || 1) - (b.month || 1);
    });
  },

  /**
   * 计算年份跨度，空数组返回 null
   */
  yearSpan(events) {
    if (!Array.isArray(events) || events.length === 0) return null;
    const years = events.map(e => e.year);
    return { min: Math.min(...years), max: Math.max(...years) };
  },

  /**
   * 校验事件：年份 1900 ~ 当前年+100，月份 1~12，文本非空（去空格后）
   */
  validateEvent(year, month, text) {
    const y = Number(year);
    const m = Number(month);
    const currentYear = new Date().getFullYear();
    if (!Number.isFinite(y) || y < 1900 || y > currentYear + 100) return false;
    if (!Number.isFinite(m) || m < 1 || m > 12) return false;
    if (typeof text !== 'string' || text.trim().length === 0) return false;
    return true;
  }
};

// ==================== 渲染管理器 ====================
const TimelineManager = {
  _nextId: 1,

  renderTimelinePage() {
    const container = document.getElementById('timeline-container');
    if (!container) return;

    let events = StorageManager.getTimeline();
    // 兼容旧数据：无 month 字段的事件补 1 月
    let needSave = false;
    events = events.map(e => {
      if (e && typeof e.month === 'undefined') {
        needSave = true;
        return { ...e, month: 1 };
      }
      return e;
    });
    if (needSave) StorageManager.setTimeline(events);

    const sorted = TimelineEngine.sortByYear(events);

    // 更新计数
    const countEl = document.getElementById('timeline-count');
    if (countEl) countEl.textContent = sorted.length;

    // 更新布局切换按钮状态
    const layout = this.getLayout();
    const singleBtn = document.getElementById('timeline-layout-single');
    const doubleBtn = document.getElementById('timeline-layout-double');
    if (singleBtn) singleBtn.classList.toggle('active', layout === 'single');
    if (doubleBtn) doubleBtn.classList.toggle('active', layout === 'double');

    if (sorted.length === 0) {
      container.innerHTML = `
        <div class="timeline-empty">
          <div class="timeline-empty-emoji">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <h3>人生轴还是空的</h3>
          <p>请点击加号添加人生事件</p>
        </div>
      `;
      return;
    }

    container.innerHTML = '';

    if (layout === 'single') {
      this._renderSingle(container, sorted);
    } else {
      this._renderDouble(container, sorted);
    }
  },

  _renderSingle(container, sorted) {
    const wrap = document.createElement('div');
    wrap.className = 'timeline-single-wrap';

    sorted.forEach((ev, index) => {
      const row = document.createElement('div');
      row.className = 'timeline-single-row';
      row.innerHTML = `
        <div class="timeline-single-left">
          <span class="timeline-single-year">${this._formatYearMonth(ev.year, ev.month)}</span>
          <span class="timeline-single-dot"></span>
          <span class="timeline-single-line"></span>
        </div>
        <div class="timeline-single-card" data-id="${ev.id}">
          <p class="timeline-single-text">${this._escapeHtml(ev.text)}</p>
        </div>
      `;
      const card = row.querySelector('.timeline-single-card');
      card.addEventListener('click', () => this._showEditModal(ev));
      wrap.appendChild(row);
      AnimationManager.animateCardEntrance(row, index * 100);
    });

    container.appendChild(wrap);
  },

  _renderDouble(container, sorted) {
    const wrap = document.createElement('div');
    wrap.className = 'timeline-double-wrap';

    // 中轴竖线
    const axis = document.createElement('div');
    axis.className = 'timeline-double-axis';
    wrap.appendChild(axis);

    sorted.forEach((ev, index) => {
      const row = document.createElement('div');
      row.className = 'timeline-double-row';
      const isLeft = index % 2 === 0;
      row.innerHTML = `
        <div class="timeline-double-side ${isLeft ? 'left' : 'right'}">
          <div class="timeline-double-card" data-id="${ev.id}">
            <span class="timeline-double-year">${this._formatYearMonth(ev.year, ev.month)}</span>
            <p class="timeline-double-text">${this._escapeHtml(ev.text)}</p>
          </div>
        </div>
        <div class="timeline-double-center">
          <span class="timeline-double-dot"></span>
        </div>
        <div class="timeline-double-side ${isLeft ? 'right' : 'left'}"></div>
      `;
      const card = row.querySelector('.timeline-double-card');
      card.addEventListener('click', () => this._showEditModal(ev));
      wrap.appendChild(row);
      AnimationManager.animateCardEntrance(row, index * 100);
    });

    container.appendChild(wrap);
  },

  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  _formatYearMonth(year, month) {
    if (!year) return '';
    const m = Number(month);
    if (!Number.isFinite(m) || m < 1 || m > 12) return `${year}年`;
    return `${year}年${m}月`;
  },

  getLayout() {
    return StorageManager.getTimelineLayout();
  },

  setLayout(layout) {
    if (layout !== 'single' && layout !== 'double') return;
    StorageManager.setTimelineLayout(layout);
    this.renderTimelinePage();
  },

  // ==================== 添加事件 ====================
  showAddModal() {
    const now = new Date();
    this._showModal('添加人生事件', now.getFullYear(), now.getMonth() + 1, '', (year, month, text) => {
      this.addEvent(year, month, text);
    });
  },

  addEvent(year, month, text) {
    if (!TimelineEngine.validateEvent(year, month, text)) {
      this.showToast('时间或描述不合法');
      return false;
    }
    const events = StorageManager.getTimeline();
    // 扫描现有 e_ 序号，取最大 +1，避免刷新后 _nextId 重置导致重复
    let maxSeq = 0;
    events.forEach(e => {
      if (e && typeof e.id === 'string' && e.id.startsWith('e_')) {
        const n = parseInt(e.id.slice(2), 10);
        if (Number.isFinite(n) && n > maxSeq) maxSeq = n;
      }
    });
    const id = 'e_' + (maxSeq + 1);
    events.push({ id, year: Number(year), month: Number(month), text: text.trim() });
    StorageManager.setTimeline(events);
    this.renderTimelinePage();
    this.showToast('已添加');
    return true;
  },

  // ==================== 编辑/删除事件 ====================
  _showEditModal(ev) {
    this._showModal('编辑事件', ev.year, ev.month, ev.text, (year, month, text) => {
      this.updateEvent(ev.id, year, month, text);
    }, () => {
      this.deleteEvent(ev.id);
    });
  },

  updateEvent(id, year, month, text) {
    if (!TimelineEngine.validateEvent(year, month, text)) {
      this.showToast('时间或描述不合法');
      return false;
    }
    const events = StorageManager.getTimeline();
    const idx = events.findIndex(e => e.id === id);
    if (idx === -1) return false;
    events[idx] = { id, year: Number(year), month: Number(month), text: text.trim() };
    StorageManager.setTimeline(events);
    this.renderTimelinePage();
    this.showToast('已更新');
    return true;
  },

  deleteEvent(id) {
    const events = StorageManager.getTimeline().filter(e => e.id !== id);
    StorageManager.setTimeline(events);
    this.renderTimelinePage();
    this.showToast('已删除');
  },

  // ==================== 通用弹窗 ====================
  _showModal(title, yearVal, monthVal, textVal, onConfirm, onDelete) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-content" style="max-width: 320px;">
        <h3>${title}</h3>
        <div class="modal-input-container" style="text-align:left;">
          <label class="form-label">时间</label>
          <button type="button" class="form-input tl-year-display" id="tl-modal-year-btn">${this._formatYearMonth(yearVal, monthVal) || '点击选择时间'}</button>
          <input type="hidden" id="tl-modal-year" value="${yearVal}">
          <input type="hidden" id="tl-modal-month" value="${monthVal}">
          <label class="form-label" style="margin-top:1rem;">描述</label>
          <textarea class="form-textarea" id="tl-modal-text" rows="3" placeholder="记录这件大事...">${textVal}</textarea>
        </div>
        <div class="modal-actions">
          <button class="modal-btn modal-btn-cancel" id="tl-modal-cancel">取消</button>
          <button class="modal-btn modal-btn-confirm" id="tl-modal-confirm">确定</button>
        </div>
        ${onDelete ? `<button class="modal-btn modal-btn-danger" id="tl-modal-delete" style="width:100%;margin-top:0.75rem;">删除</button>` : ''}
      </div>
    `;

    document.body.appendChild(overlay);

    const yearBtn = document.getElementById('tl-modal-year-btn');
    const yearHidden = document.getElementById('tl-modal-year');
    const monthHidden = document.getElementById('tl-modal-month');
    yearBtn.addEventListener('click', () => {
      DatePickerManager.openYearMonth(
        yearHidden.value || new Date().getFullYear(),
        monthHidden.value || (new Date().getMonth() + 1),
        ({ year, month }) => {
          yearHidden.value = year;
          monthHidden.value = month;
          yearBtn.textContent = this._formatYearMonth(year, month);
        }
      );
    });

    document.getElementById('tl-modal-cancel').addEventListener('click', () => overlay.remove());
    document.getElementById('tl-modal-confirm').addEventListener('click', () => {
      const year = document.getElementById('tl-modal-year').value;
      const month = document.getElementById('tl-modal-month').value;
      const text = document.getElementById('tl-modal-text').value;
      overlay.remove();
      onConfirm(year, month, text);
    });

    if (onDelete) {
      document.getElementById('tl-modal-delete').addEventListener('click', () => {
        overlay.remove();
        onDelete();
      });
    }

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
  },

  // ==================== 分享卡 ====================
  showShareCard() {
    const events = StorageManager.getTimeline();
    const sorted = TimelineEngine.sortByYear(events);
    const span = TimelineEngine.yearSpan(sorted);

    const overlay = document.createElement('div');
    overlay.className = 'share-overlay';
    overlay.innerHTML = `
      <div class="share-modal">
        <div class="share-modal-header">
          <h3>分享我的人生时间轴</h3>
          <button class="share-close-btn" onclick="this.closest('.share-overlay').remove()">✕</button>
        </div>
        <div class="share-preview" id="timeline-share-preview">
          ${this._generateShareCardHTML(sorted, span)}
        </div>
        <div class="share-actions">
          <button class="share-btn share-btn-danger" onclick="TimelineManager._downloadShareImage()">保存图片</button>
          <button class="share-btn share-btn-success" onclick="TimelineManager._shareTimeline()">分享</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
  },

  _generateShareCardHTML(sorted, span) {
    const spanText = span ? `${span.min} — ${span.max}` : '—';
    const items = sorted.map(ev => `
      <div class="timeline-share-item">
        <span class="timeline-share-year">${this._formatYearMonth(ev.year, ev.month)}</span>
        <span class="timeline-share-text">${this._escapeHtml(ev.text)}</span>
      </div>
    `).join('');

    return `
      <div class="share-card" id="timeline-share-card" style="background: var(--surface); color: var(--text);">
        <div class="share-card-header" style="margin-bottom: 1rem;">
          <h4 style="font-size: 1.125rem; font-weight: 700;">我的人生时间轴</h4>
        </div>
        <p style="font-size: 0.875rem; color: var(--text-2); margin-bottom: 1rem;">
          共 ${sorted.length} 件事 · 年份跨度 ${spanText}
        </p>
        <div class="timeline-share-list" style="max-height: 280px; overflow-y: auto; margin-bottom: 1rem;">
          ${items}
        </div>
        <div class="share-card-footer" style="border-top: 1px solid var(--border); padding-top: 0.75rem;">
          <span>人生已完成清单 App</span>
          <span>记录每一段认真活过的日子</span>
        </div>
      </div>
    `;
  },

  _shareTimeline() {
    const events = StorageManager.getTimeline();
    const sorted = TimelineEngine.sortByYear(events);
    const span = TimelineEngine.yearSpan(sorted);
    const title = '我的人生时间轴';
    const text = sorted.length > 0
      ? `共 ${sorted.length} 件事，年份跨度 ${span ? span.min + ' — ' + span.max : '—'}。记录每一段认真活过的日子。`
      : '我的人生时间轴，等待记录第一段故事。';
    if (navigator.share) {
      navigator.share({ title, text }).catch(() => {});
    } else {
      this.showToast('长按卡片图片即可保存分享');
    }
  },

  _downloadShareImage() {
    const card = document.getElementById('timeline-share-card');
    if (!card) return;
    if (!window.html2canvas) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
      script.onload = () => {
        ShareManager.captureCard(card);
      };
      document.head.appendChild(script);
    } else {
      ShareManager.captureCard(card);
    }
  },

  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'share-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }
};
