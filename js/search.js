/**
 * 搜索模块
 */

const SearchManager = {
  isOpen: false,

  openSearch() {
    this.isOpen = true;

    const overlay = document.createElement('div');
    overlay.className = 'search-overlay';
    overlay.id = 'search-overlay';
    overlay.innerHTML = `
      <div class="search-container">
        <div class="search-header">
          <div class="search-input-wrapper">
            <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-4.35-4.35"/>
            </svg>
            <input type="text" id="search-input" class="search-input" placeholder="搜索清单或任务..." autofocus>
          </div>
          <button class="search-cancel" id="search-cancel">取消</button>
        </div>
        <div class="search-results" id="search-results">
          <div class="search-hint">
            <p>输入关键词搜索</p>
            <p class="search-hint-sub">支持搜索清单名称和任务内容</p>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('search-cancel').addEventListener('click', () => this.closeSearch());
    document.getElementById('search-input').addEventListener('input', (e) => this.handleSearch(e.target.value));

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.closeSearch();
    });

    setTimeout(() => {
      document.getElementById('search-input').focus();
    }, 100);
  },

  closeSearch() {
    this.isOpen = false;
    const overlay = document.getElementById('search-overlay');
    if (overlay) overlay.remove();
  },

  handleSearch(keyword) {
    const container = document.getElementById('search-results');
    if (!keyword.trim()) {
      container.innerHTML = `
        <div class="search-hint">
          <p>输入关键词搜索</p>
          <p class="search-hint-sub">支持搜索清单名称和任务内容</p>
        </div>
      `;
      return;
    }

    const results = this.search(keyword.trim());

    if (results.length === 0) {
      container.innerHTML = `
        <div class="search-empty">
          <p>没有找到匹配的内容</p>
          <p class="search-empty-sub">试试其他关键词</p>
        </div>
      `;
      return;
    }

    container.innerHTML = results.map(result => {
      if (result.type === 'list') {
        return `
          <div class="search-result-item" onclick="SearchManager.goToList('${result.list.id}')">
            <div class="search-result-emoji" style="background: ${result.list.color}15">${result.list.emoji}</div>
            <div class="search-result-info">
              <div class="search-result-title">${this.highlightText(result.list.title, keyword)}</div>
              <div class="search-result-desc">${result.list.description}</div>
            </div>
            <div class="search-result-type">清单</div>
          </div>
        `;
      } else {
        return `
          <div class="search-result-item" onclick="SearchManager.goToList('${result.list.id}')">
            <div class="search-result-emoji" style="background: ${result.list.color}15">${result.list.emoji}</div>
            <div class="search-result-info">
              <div class="search-result-title">${this.highlightText(result.task.text, keyword)}</div>
              <div class="search-result-desc">${result.list.title} · ${result.task.completed ? '已完成' : '未完成'}</div>
            </div>
            <div class="search-result-type">任务</div>
          </div>
        `;
      }
    }).join('');
  },

  search(keyword) {
    const lists = StorageManager.getLists() || DEFAULT_LISTS;
    const results = [];
    const lowerKeyword = keyword.toLowerCase();

    lists.forEach(list => {
      if (list.title.toLowerCase().includes(lowerKeyword) ||
          list.description.toLowerCase().includes(lowerKeyword)) {
        results.push({ type: 'list', list: list });
      }

      list.tasks.forEach(task => {
        if (task.text.toLowerCase().includes(lowerKeyword)) {
          results.push({ type: 'task', list: list, task: task });
        }
      });
    });

    return results;
  },

  highlightText(text, keyword) {
    const regex = new RegExp(`(${keyword})`, 'gi');
    return text.replace(regex, '<span class="highlight">$1</span>');
  },

  goToList(listId) {
    this.closeSearch();
    showListDetail(listId);
  }
};
