/**
 * 任务详情模块
 */

const TaskDetailManager = {
  showTaskDetail(listId, taskId) {
    const lists = StorageManager.getLists() || [];
    const list = lists.find(l => l.id === listId);
    if (!list) return;

    const task = list.tasks.find(t => t.id === taskId);
    if (!task) return;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-content task-detail-modal">
        <div class="task-detail-header">
          <div class="task-detail-status ${task.completed ? 'completed' : ''}">
            ${task.completed ? '已完成' : '进行中'}
          </div>
          <button class="task-detail-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
        </div>

        <h3 class="task-detail-title">${task.text}</h3>
        <p class="task-detail-list">${list.emoji} ${list.title}</p>

        <div class="task-detail-section">
          <label class="form-label">完成照片</label>
          <div class="task-photo-upload" id="task-photo-upload">
            ${task.photo ? `
              <div class="task-photo-preview">
                <img src="${task.photo}" alt="完成照片" onclick="TaskDetailManager.openPhotoLightbox('${task.photo}')">
                <button class="task-photo-remove" onclick="TaskDetailManager.removePhoto('${listId}', '${taskId}')">✕</button>
              </div>
            ` : `
              <label class="task-photo-input-label">
                <input type="file" id="task-photo-input" accept="image/*" style="display: none;">
                <span>添加照片</span>
              </label>
            `}
          </div>
        </div>

        <div class="task-detail-section">
          <label class="form-label">笔记</label>
          <textarea id="task-note" class="form-textarea" placeholder="添加笔记...">${task.note || ''}</textarea>
        </div>

        <div class="task-detail-section">
          <label class="form-label">完成日期</label>
          <input type="date" id="task-date" class="form-input" value="${task.completedDate || ''}">
        </div>

        <div class="task-detail-section">
          <label class="form-label">重要程度</label>
          <div class="priority-selector" id="priority-selector">
            <span class="priority-option ${task.priority === 'low' ? 'selected' : ''}" data-priority="low">低</span>
            <span class="priority-option ${task.priority === 'medium' ? 'selected' : ''}" data-priority="medium">中</span>
            <span class="priority-option ${task.priority === 'high' ? 'selected' : ''}" data-priority="high">高</span>
          </div>
        </div>

        <div class="task-detail-actions">
          <button class="task-detail-btn task-detail-btn-delete" onclick="TaskDetailManager.deleteTask('${listId}', '${taskId}')">
            删除任务
          </button>
          <button class="task-detail-btn task-detail-btn-save" onclick="TaskDetailManager.saveTaskDetail('${listId}', '${taskId}')">
            保存
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // 绑定照片上传
    const photoInput = document.getElementById('task-photo-input');
    if (photoInput) {
      photoInput.addEventListener('change', (e) => {
        this.handlePhotoUpload(e, listId, taskId);
      });
    }

    overlay.querySelectorAll('.priority-option').forEach(option => {
      option.addEventListener('click', () => {
        overlay.querySelectorAll('.priority-option').forEach(o => o.classList.remove('selected'));
        option.classList.add('selected');
      });
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
  },

  handlePhotoUpload(event, listId, taskId) {
    const file = event.target.files[0];
    if (!file) return;

    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      this.showToast('照片大小不能超过 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const photoData = e.target.result;
      this.saveTaskPhoto(listId, taskId, photoData);
    };
    reader.readAsDataURL(file);
  },

  openPhotoLightbox(photoSrc) {
    // 防止重复打开多个图片灯箱
    const existing = document.querySelector('.photo-lightbox-overlay');
    if (existing) return;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay photo-lightbox-overlay';
    overlay.innerHTML = `
      <div class="photo-lightbox-content">
        <img src="${photoSrc}" alt="完成照片">
        <button class="photo-lightbox-close">✕</button>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('.photo-lightbox-close').addEventListener('click', () => {
      overlay.remove();
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
  },

  saveTaskPhoto(listId, taskId, photoData) {
    const lists = StorageManager.getLists() || [];
    const list = lists.find(l => l.id === listId);
    if (!list) return;

    const task = list.tasks.find(t => t.id === taskId);
    if (!task) return;

    task.photo = photoData;
    StorageManager.setLists(lists);
    AppState.lists = lists;

    this.updateTimelinePhoto(listId, taskId, photoData);

    document.querySelector('.modal-overlay')?.remove();
    this.showTaskDetail(listId, taskId);

    this.showToast('照片已添加 ✅');
  },

  removePhoto(listId, taskId) {
    const lists = StorageManager.getLists() || [];
    const list = lists.find(l => l.id === listId);
    if (!list) return;

    const task = list.tasks.find(t => t.id === taskId);
    if (!task) return;

    delete task.photo;
    StorageManager.setLists(lists);
    AppState.lists = lists;

    this.updateTimelinePhoto(listId, taskId, null);

    document.querySelector('.modal-overlay')?.remove();
    this.showTaskDetail(listId, taskId);

    this.showToast('照片已删除');
  },

  updateTimelinePhoto(listId, taskId, photoData) {
    const timeline = StorageManager.getTimeline();
    const event = timeline.find(e => e.listId === listId && e.taskId === taskId);

    if (event) {
      if (photoData) {
        event.photo = photoData;
      } else {
        delete event.photo;
      }
      StorageManager.setTimeline(timeline);
    }
  },

  saveTaskDetail(listId, taskId) {
    const lists = StorageManager.getLists() || [];
    const list = lists.find(l => l.id === listId);
    if (!list) return;

    const task = list.tasks.find(t => t.id === taskId);
    if (!task) return;

    task.note = document.getElementById('task-note').value.trim();
    task.completedDate = document.getElementById('task-date').value;
    task.priority = document.querySelector('.priority-option.selected')?.dataset.priority || 'medium';

    StorageManager.setLists(lists);
    AppState.lists = lists;

    document.querySelector('.modal-overlay')?.remove();
    this.showToast('任务已更新 ✅');

    if (AppState.currentView === 'detail' && AppState.currentListId === listId) {
      renderListDetail(listId);
    }
  },

  deleteTask(listId, taskId) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-content">
        <h3>删除任务</h3>
        <p class="modal-desc">确定要删除这个任务吗？此操作无法撤销。</p>
        <div class="modal-actions">
          <button class="modal-btn modal-btn-cancel" onclick="this.closest('.modal-overlay').remove()">取消</button>
          <button class="modal-btn modal-btn-danger" id="confirm-delete-task">删除</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('confirm-delete-task').addEventListener('click', () => {
      CustomManager.deleteTask(listId, taskId);
      overlay.remove();
      document.querySelector('.task-detail-modal')?.closest('.modal-overlay')?.remove();
      this.showToast('任务已删除');
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
