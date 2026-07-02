/**
 * 分享模块
 */

const ShareManager = {
  showShareModal() {
    const overlay = document.createElement('div');
    overlay.className = 'share-overlay';
    overlay.innerHTML = `
      <div class="share-modal">
        <div class="share-modal-header">
          <h3>分享我的成就</h3>
          <button class="share-close-btn" onclick="this.closest('.share-overlay').remove()">✕</button>
        </div>
        <div class="share-preview" id="share-preview">
          ${this.generateShareCard()}
        </div>
        <div class="share-actions">
          <button class="share-btn share-btn-copy" onclick="ShareManager.copyShareText()">
            复制文字
          </button>
          <button class="share-btn share-btn-image" onclick="ShareManager.downloadShareImage()">
            保存图片
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
  },

  generateShareCard() {
    const stats = StorageManager.getOverallStats();
    const lists = StorageManager.getLists() || DEFAULT_LISTS;
    const achievements = StorageManager.getUnlockedAchievements();

    const topList = lists.reduce((max, list) => {
      const progress = StorageManager.calculateListProgress(list);
      const maxProgress = StorageManager.calculateListProgress(max);
      return progress.percentage > maxProgress.percentage ? list : max;
    }, lists[0]);

    const topProgress = StorageManager.calculateListProgress(topList);

    return `
      <div class="share-card">
        <div class="share-card-header">
          <div class="share-card-logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 3L14.5 8.5L20 11L14.5 13.5L12 19L9.5 13.5L4 11L9.5 8.5L12 3Z"/>
            </svg>
          </div>
          <h4>人生已完成清单</h4>
        </div>

        <div class="share-card-stats">
          <div class="share-stat">
            <span class="share-stat-value">${stats.totalCompleted}</span>
            <span class="share-stat-label">已完成任务</span>
          </div>
          <div class="share-stat-divider"></div>
          <div class="share-stat">
            <span class="share-stat-value">${achievements.length}</span>
            <span class="share-stat-label">解锁成就</span>
          </div>
          <div class="share-stat-divider"></div>
          <div class="share-stat">
            <span class="share-stat-value">${stats.completedLists}</span>
            <span class="share-stat-label">完成清单</span>
          </div>
        </div>

        <div class="share-card-highlight">
          <div class="share-highlight-emoji">${topList.emoji}</div>
          <div class="share-highlight-info">
            <span class="share-highlight-title">最佳进度</span>
            <span class="share-highlight-name">${topList.title} ${Math.round(topProgress.percentage)}%</span>
          </div>
        </div>

        <div class="share-card-footer">
          <span>记录人生每一个精彩时刻</span>
          <span class="share-card-date">${new Date().toLocaleDateString('zh-CN')}</span>
        </div>
      </div>
    `;
  },

  copyShareText() {
    const stats = StorageManager.getOverallStats();
    const achievements = StorageManager.getUnlockedAchievements();

    const text = `我的人生清单进度

已完成 ${stats.totalCompleted} 个任务
解锁 ${achievements.length} 个成就
完成 ${stats.completedLists} 个清单

人生就像一场旅行，每完成一个小目标都是值得纪念的时刻！

#人生清单 #记录生活 #成就`;

    navigator.clipboard.writeText(text).then(() => {
      this.showToast('已复制到剪贴板 ✅');
    }).catch(() => {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      this.showToast('已复制到剪贴板 ✅');
    });
  },

  // 确保 html2canvas 可用后执行回调
  _withHtml2Canvas(callback) {
    if (window.html2canvas) {
      callback();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
    script.onload = () => callback();
    script.onerror = () => {
      this.showToast('图片生成失败，请重试');
      script.remove();
    };
    document.head.appendChild(script);
  },

  downloadShareImage() {
    const card = document.querySelector('.share-card');
    if (!card) return;
    this._withHtml2Canvas(() => this.captureCard(card));
  },

  captureCard(element) {
    html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true
    }).then(canvas => {
      const link = document.createElement('a');
      link.download = '人生清单成就_' + new Date().toISOString().slice(0, 10) + '.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
      this.showToast('图片已保存 ✅');
    });
  },

  // 截图余生闹钟卡片为 PNG 并下载
  saveLifeClockImage() {
    const element = document.getElementById('lifeclock-card');
    if (!element) return;
    this._withHtml2Canvas(() => {
      html2canvas(element, { backgroundColor: '#f5f5f0', scale: 2 }).then(canvas => {
        const link = document.createElement('a');
        link.download = '余生闹钟_' + new Date().toISOString().slice(0, 10) + '.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
      });
    });
  },

  // 截图清单详情卡片（标题条 + 标签网格）为 PNG 并下载
  captureDetailCard() {
    const shareArea = document.getElementById('detail-share-area');
    if (!shareArea) return;
    this._withHtml2Canvas(() => {
      html2canvas(shareArea, {
        backgroundColor: getComputedStyle(document.body).backgroundColor,
        scale: 2,
        useCORS: true,
        logging: false
      }).then(canvas => {
        const link = document.createElement('a');
        link.download = '我的清单_' + new Date().toISOString().slice(0, 10) + '.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
        this.showToast('图片已保存 ✅');
      }).catch(err => {
        console.error('html2canvas 失败:', err);
        this.showToast('图片生成失败，请重试');
      });
    });
  },

  // 生成余生闹钟分享文案
  generateLifeClockShareText(age, lifeExpectancy, events) {
    const ageFloor = Math.floor(age);
    const remainingYears = Math.max(0, lifeExpectancy - ageFloor);
    const remainingDays = Math.round(remainingYears * 365.25);
    const eventLines = events.slice(0, 3).map(e => `${e.emoji} ${e.text}`).join('\n');
    return `我今年 ${ageFloor} 岁了，余生大约还有 ${remainingDays.toLocaleString('zh-CN')} 天。\n\n${eventLines}\n\n认真活好每一天 ✨\n#人生清单 #余生闹钟`;
  },

  // 显示余生闹钟分享弹窗
  showLifeClockShareModal() {
    const overlay = document.createElement('div');
    overlay.className = 'share-overlay';
    overlay.innerHTML = `
      <div class="share-modal">
        <div class="share-modal-header">
          <h3>分享余生闹钟</h3>
          <button class="share-close-btn" onclick="this.closest('.share-overlay').remove()">✕</button>
        </div>
        <div class="share-actions-vertical" style="display:flex;flex-direction:column;gap:0.75rem;padding:1rem;">
          <button class="share-btn share-btn-image" id="life-share-save">保存图片</button>
          <button class="share-btn share-btn-copy" id="life-share-copy">复制文案</button>
          <button class="share-btn share-btn-success" id="life-share-system">系统分享</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const ageEl = document.getElementById('life-age-value');
    const age = ageEl ? parseFloat(ageEl.textContent) : 0;
    const lifeExpectancy = StorageManager.getLifeExpectancy();
    const birth = LifeClockUI.getEffectiveBirthDate();
    const events = LifeClockEngine.calcEvents({
      birthDate: birth,
      now: Date.now(),
      lifeExpectancy: lifeExpectancy
    });
    const shareText = this.generateLifeClockShareText(age, lifeExpectancy, events);

    document.getElementById('life-share-save').addEventListener('click', () => {
      this.saveLifeClockImage();
    });

    document.getElementById('life-share-copy').addEventListener('click', () => {
      navigator.clipboard.writeText(shareText).then(() => {
        this.showToast('文案已复制 ✅');
      }).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = shareText;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        this.showToast('文案已复制 ✅');
      });
    });

    const systemBtn = document.getElementById('life-share-system');
    if (navigator.share) {
      systemBtn.addEventListener('click', () => {
        navigator.share({ title: '余生闹钟', text: shareText }).catch(() => {});
      });
    } else {
      systemBtn.style.display = 'none';
    }

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
  },

  // 分享：优先系统分享，降级为保存图片
  shareLifeClock() {
    const age = document.getElementById('life-age-value');
    const text = age ? `你 ${age.textContent} 岁了，余生还可以体验很多美好 ✨` : '余生闹钟';
    if (navigator.share) {
      navigator.share({ title: '余生闹钟', text }).catch(() => {});
    } else {
      this.saveLifeClockImage();
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
