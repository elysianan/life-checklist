/**
 * 人生轴模块
 */

const TimelineManager = {
  renderTimelinePage() {
    const container = document.getElementById('timeline-container');
    if (!container) return;

    const timeline = StorageManager.getTimeline();

    document.getElementById('timeline-count').textContent = timeline.length;

    if (timeline.length === 0) {
      container.innerHTML = `
        <div class="timeline-empty">
          <div class="timeline-empty-emoji">📅</div>
          <h3>人生轴还是空的</h3>
          <p>完成清单中的任务后，它们会自动出现在这里</p>
          <button class="timeline-empty-btn" onclick="showListsPage()">去完成任务</button>
        </div>
      `;
      return;
    }

    container.innerHTML = '';

    const grouped = this.groupByDate(timeline);

    Object.keys(grouped).forEach((date, index) => {
      const group = grouped[date];
      const groupElement = this.createTimelineGroup(date, group, index);
      container.appendChild(groupElement);
    });
  },

  groupByDate(timeline) {
    const grouped = {};

    timeline.forEach(event => {
      const date = new Date(event.date).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      if (!grouped[date]) {
        grouped[date] = [];
      }

      grouped[date].push(event);
    });

    return grouped;
  },

  createTimelineGroup(date, events, index) {
    const group = document.createElement('div');
    group.className = 'timeline-group';

    group.innerHTML = `
      <div class="timeline-date">
        <span class="timeline-dot"></span>
        <span class="timeline-date-text">${date}</span>
      </div>
      <div class="timeline-events">
        ${events.map(event => `
          <div class="timeline-event">
            <div class="timeline-event-emoji" style="background: ${event.color}15">${event.emoji}</div>
            <div class="timeline-event-content">
              <p class="timeline-event-title">${event.title}</p>
              ${event.photo ? `<div class="timeline-event-photo"><img src="${event.photo}" alt="完成照片" loading="lazy"></div>` : ''}
              <p class="timeline-event-time">${new Date(event.date).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            <button class="timeline-delete-btn" onclick="TimelineManager.deleteEvent('${event.id}')">✕</button>
          </div>
        `).join('')}
      </div>
    `;

    AnimationManager.animateCardEntrance(group, index * 150);

    return group;
  },

  deleteEvent(eventId) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-content">
        <h3>⚠️ 删除记录</h3>
        <p class="modal-desc">确定要从人生轴中删除这条记录吗？</p>
        <div class="modal-actions">
          <button class="modal-btn modal-btn-cancel" onclick="this.closest('.modal-overlay').remove()">取消</button>
          <button class="modal-btn modal-btn-danger" id="confirm-delete-timeline">删除</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('confirm-delete-timeline').addEventListener('click', () => {
      StorageManager.removeTimelineEvent(eventId);
      overlay.remove();
      this.renderTimelinePage();
      updateOverallStats();
      this.showToast('记录已删除');
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
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
