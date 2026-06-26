/**
 * 自定义清单模块
 */

const CustomManager = {
  showAddListModal() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-content" style="max-width: 360px;">
        <h3>✨ 创建新清单</h3>
        <p class="modal-desc">自定义你的人生目标</p>

        <div class="form-group">
          <label class="form-label">选择图标</label>
          <div class="emoji-picker" id="emoji-picker">
            <span class="emoji-option selected" data-emoji="🎯">🎯</span>
            <span class="emoji-option" data-emoji="⭐">⭐</span>
            <span class="emoji-option" data-emoji="💎">💎</span>
            <span class="emoji-option" data-emoji="🌟">🌟</span>
            <span class="emoji-option" data-emoji="🎨">🎨</span>
            <span class="emoji-option" data-emoji="🎵">🎵</span>
            <span class="emoji-option" data-emoji="📚">📚</span>
            <span class="emoji-option" data-emoji="✈️">✈️</span>
            <span class="emoji-option" data-emoji="🏠">🏠</span>
            <span class="emoji-option" data-emoji="💰">💰</span>
            <span class="emoji-option" data-emoji="❤️">❤️</span>
            <span class="emoji-option" data-emoji="🔥">🔥</span>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">清单名称</label>
          <input type="text" id="list-name-input" class="form-input" placeholder="例如：学习计划" maxlength="20">
        </div>

        <div class="form-group">
          <label class="form-label">描述（可选）</label>
          <input type="text" id="list-desc-input" class="form-input" placeholder="简短描述这个清单">
        </div>

        <div class="form-group">
          <label class="form-label">选择颜色</label>
          <div class="color-picker" id="color-picker">
            <span class="color-option selected" data-color="#007AFF" style="background: #007AFF"></span>
            <span class="color-option" data-color="#FF9500" style="background: #FF9500"></span>
            <span class="color-option" data-color="#FF2D55" style="background: #FF2D55"></span>
            <span class="color-option" data-color="#34C759" style="background: #34C759"></span>
            <span class="color-option" data-color="#5856D6" style="background: #5856D6"></span>
            <span class="color-option" data-color="#AF52DE" style="background: #AF52DE"></span>
            <span class="color-option" data-color="#FF3B30" style="background: #FF3B30"></span>
            <span class="color-option" data-color="#5AC8FA" style="background: #5AC8FA"></span>
          </div>
        </div>

        <div class="modal-actions">
          <button class="modal-btn modal-btn-cancel" onclick="this.closest('.modal-overlay').remove()">取消</button>
          <button class="modal-btn modal-btn-confirm" id="confirm-add-list">创建</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelectorAll('.emoji-option').forEach(option => {
      option.addEventListener('click', () => {
        overlay.querySelectorAll('.emoji-option').forEach(o => o.classList.remove('selected'));
        option.classList.add('selected');
      });
    });

    overlay.querySelectorAll('.color-option').forEach(option => {
      option.addEventListener('click', () => {
        overlay.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
        option.classList.add('selected');
      });
    });

    document.getElementById('confirm-add-list').addEventListener('click', () => {
      const name = document.getElementById('list-name-input').value.trim();
      if (!name) {
        AnimationManager.createShakeEffect(document.getElementById('list-name-input'));
        return;
      }

      const emoji = overlay.querySelector('.emoji-option.selected').dataset.emoji;
      const color = overlay.querySelector('.color-option.selected').dataset.color;
      const desc = document.getElementById('list-desc-input').value.trim() || '自定义清单';

      this.addCustomList(emoji, name, desc, color);
      overlay.remove();
      this.showToast('清单创建成功 ✅');
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    setTimeout(() => {
      document.getElementById('list-name-input').focus();
    }, 300);
  },

  addCustomList(emoji, title, description, color) {
    const lists = StorageManager.getLists() || [];
    const newList = {
      id: 'custom_' + Date.now(),
      emoji: emoji,
      title: title,
      description: description,
      color: color,
      category: '自定义',
      isCustom: true,
      tasks: []
    };

    lists.push(newList);
    StorageManager.setLists(lists);
    AppState.lists = lists;

    renderListCards();
    updateListsOverview();
    updateOverallStats();
  },

  showAddTaskModal(listId) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-content">
        <h3>📝 添加新任务</h3>
        <p class="modal-desc">添加你想完成的事情</p>

        <div class="form-group">
          <input type="text" id="task-name-input" class="form-input" placeholder="输入任务内容" maxlength="50">
        </div>

        <div class="modal-actions">
          <button class="modal-btn modal-btn-cancel" onclick="this.closest('.modal-overlay').remove()">取消</button>
          <button class="modal-btn modal-btn-confirm" id="confirm-add-task">添加</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('confirm-add-task').addEventListener('click', () => {
      const text = document.getElementById('task-name-input').value.trim();
      if (!text) {
        AnimationManager.createShakeEffect(document.getElementById('task-name-input'));
        return;
      }

      this.addTaskToList(listId, text);
      overlay.remove();
      this.showToast('任务添加成功 ✅');
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    setTimeout(() => {
      document.getElementById('task-name-input').focus();
    }, 300);
  },

  addTaskToList(listId, text) {
    const lists = StorageManager.getLists() || [];
    const list = lists.find(l => l.id === listId);

    if (list) {
      const newTask = {
        id: 'task_' + Date.now(),
        text: text,
        completed: false,
        completedDate: '',
        note: '',
        priority: 'medium'
      };

      list.tasks.push(newTask);
      StorageManager.setLists(lists);
      AppState.lists = lists;

      renderListDetail(listId);
      renderListCards();
      updateOverallStats();
    }
  },

  deleteList(listId) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-content">
        <h3>⚠️ 删除清单</h3>
        <p class="modal-desc">确定要删除这个清单吗？所有任务都将被删除，此操作无法撤销。</p>
        <div class="modal-actions">
          <button class="modal-btn modal-btn-cancel" onclick="this.closest('.modal-overlay').remove()">取消</button>
          <button class="modal-btn modal-btn-danger" id="confirm-delete-list">删除</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('confirm-delete-list').addEventListener('click', () => {
      const lists = StorageManager.getLists() || [];
      const listToDelete = lists.find(l => l.id === listId);

      // 如果删除的是从模板添加的清单，需要移除模板记录
      if (listToDelete && listToDelete.isTemplate) {
        StorageManager.removeTemplate(listId);
      }

      const filteredLists = lists.filter(l => l.id !== listId);

      StorageManager.setLists(filteredLists);
      AppState.lists = filteredLists;

      overlay.remove();
      showListsPage();
      this.showToast('清单已删除');
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
  },

  deleteTask(listId, taskId) {
    const lists = StorageManager.getLists() || [];
    const list = lists.find(l => l.id === listId);

    if (list) {
      list.tasks = list.tasks.filter(t => t.id !== taskId);
      StorageManager.setLists(lists);
      AppState.lists = lists;

      renderListDetail(listId);
      renderListCards();
      updateOverallStats();
    }
  },

  editListName(listId) {
    const lists = StorageManager.getLists() || [];
    const list = lists.find(l => l.id === listId);
    if (!list) return;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-content">
        <h3>✏️ 编辑清单</h3>

        <div class="form-group">
          <label class="form-label">清单名称</label>
          <input type="text" id="edit-list-name" class="form-input" value="${list.title}" maxlength="20">
        </div>

        <div class="form-group">
          <label class="form-label">描述</label>
          <input type="text" id="edit-list-desc" class="form-input" value="${list.description}">
        </div>

        <div class="modal-actions">
          <button class="modal-btn modal-btn-cancel" onclick="this.closest('.modal-overlay').remove()">取消</button>
          <button class="modal-btn modal-btn-confirm" id="confirm-edit-list">保存</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('confirm-edit-list').addEventListener('click', () => {
      const newName = document.getElementById('edit-list-name').value.trim();
      if (!newName) {
        AnimationManager.createShakeEffect(document.getElementById('edit-list-name'));
        return;
      }

      list.title = newName;
      list.description = document.getElementById('edit-list-desc').value.trim() || list.description;

      StorageManager.setLists(lists);
      AppState.lists = lists;

      overlay.remove();
      renderListDetail(listId);
      renderListCards();
      this.showToast('清单已更新 ✅');
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
