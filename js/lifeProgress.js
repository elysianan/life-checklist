/**
 * 人生进度 —— 纯逻辑引擎 + 管理器
 */

const COLORS = ['#007AFF', '#FF9500', '#FF2D55', '#34C759', '#5856D6', '#AF52DE', '#FF3B30', '#5AC8FA'];

// ==================== 纯逻辑（可测，不碰 DOM）====================
const LifeProgressEngine = {
  /**
   * 计算人生进度（整周岁算法）
   * @param {string|null} birthDateStr - 'YYYY-MM-DD' 或 null
   * @param {number} lifeExpectancy - 目标寿命
   * @param {number} nowMs - 当前时间戳（毫秒）
   * @returns {{age: number, percentage: number, hasBirth: boolean}}
   */
  calcProgress(birthDateStr, lifeExpectancy, nowMs) {
    if (!birthDateStr) {
      return { age: 0, percentage: 0, hasBirth: false };
    }
    const age = Math.floor(LifeClockEngine.calcAge(birthDateStr, nowMs));
    const percentage = lifeExpectancy <= age ? 100 : Math.min(100, Math.round(age / lifeExpectancy * 100));
    return { age, percentage, hasBirth: true };
  }
};

// ==================== 管理器（数据存取 + 渲染）====================
const LifeProgressManager = {
  _editPersonId: null,      // 当前编辑中的人物 id（null = 新建）
  _editBirthDate: '',       // 编辑页当前选中的生日
  _editColor: COLORS[0],    // 编辑页当前选中的颜色
  _inlinePickerTimer: null, // 内联滚轮防抖定时器

  /**
   * 确保 persons 数组中包含 isSelf 条目
   */
  ensureSelf() {
    const persons = StorageManager.getPersons();
    const hasSelf = persons.some(p => p.isSelf);
    if (!hasSelf) {
      persons.unshift({ id: 'self', name: '我', color: '#007AFF', isSelf: true });
      StorageManager.setPersons(persons);
    }
  },

  /**
   * 获取用于渲染的人物列表（isSelf 的 birthDate/lifeExpectancy 填全局值）
   */
  getPersonsForRender() {
    const persons = StorageManager.getPersons();
    return persons.map(p => {
      if (p.isSelf) {
        return {
          ...p,
          birthDate: StorageManager.getBirthDate(),
          lifeExpectancy: StorageManager.getLifeExpectancy()
        };
      }
      return { ...p };
    });
  },

  /**
   * 获取人物的生日（isSelf 代理全局）
   */
  getBirthDateOf(person) {
    return person.isSelf ? StorageManager.getBirthDate() : person.birthDate;
  },

  /**
   * 获取人物的寿命（isSelf 代理全局）
   */
  getLifeExpectancyOf(person) {
    return person.isSelf ? StorageManager.getLifeExpectancy() : person.lifeExpectancy;
  },

  /**
   * 保存人物（新建或更新）
   * @param {Object} data - { id?, name, birthDate, lifeExpectancy, color }
   * @returns {boolean} 是否成功
   */
  savePerson(data) {
    const name = (data.name || '').trim();
    if (!name) return false;

    const lifeExpectancy = parseInt(data.lifeExpectancy, 10);
    if (!Number.isFinite(lifeExpectancy) || lifeExpectancy < 40 || lifeExpectancy > 150) return false;

    const persons = StorageManager.getPersons();

    if (data.id === 'self') {
      // isSelf：生日/寿命写全局，name/color 写回 persons
      const selfIdx = persons.findIndex(p => p.id === 'self');
      if (selfIdx >= 0) {
        persons[selfIdx].name = name;
        persons[selfIdx].color = data.color || COLORS[0];
      }
      StorageManager.setPersons(persons);
      if (data.birthDate) StorageManager.setBirthDate(data.birthDate);
      StorageManager.setLifeExpectancy(lifeExpectancy);
      return true;
    }

    // 非 isSelf
    if (data.id) {
      // 编辑
      const idx = persons.findIndex(p => p.id === data.id);
      if (idx >= 0) {
        persons[idx] = {
          ...persons[idx],
          name,
          birthDate: data.birthDate || '',
          lifeExpectancy,
          color: data.color || COLORS[0]
        };
        StorageManager.setPersons(persons);
        return true;
      }
    }

    // 新建
    let maxNum = 0;
    persons.forEach(p => {
      if (p.id && p.id.startsWith('p_')) {
        const num = parseInt(p.id.slice(2), 10);
        if (Number.isFinite(num) && num > maxNum) maxNum = num;
      }
    });
    const newId = 'p_' + (maxNum + 1);
    persons.push({
      id: newId,
      name,
      birthDate: data.birthDate || '',
      lifeExpectancy,
      color: data.color || COLORS[0]
    });
    StorageManager.setPersons(persons);
    return true;
  },

  /**
   * 删除人物（isSelf 禁删）
   */
  deletePerson(id) {
    if (id === 'self') return false;
    const persons = StorageManager.getPersons().filter(p => p.id !== id);
    StorageManager.setPersons(persons);
    return true;
  },

  // ==================== 列表页渲染 ====================
  renderList() {
    this.ensureSelf();
    const container = document.getElementById('lifeprogress-view');
    if (!container) return;

    const persons = this.getPersonsForRender();
    const nowMs = Date.now();

    // 构建列表页 HTML（保留容器结构，只替换内部内容）
    let html = `
      <header class="pt-6 pb-4">
        <div class="flex items-center justify-between">
          <h1 class="text-3xl font-bold text-apple-dark dark:text-white mb-1">人生进度</h1>
          <button id="lp-add-btn" class="w-10 h-10 bg-white dark:bg-gray-900 rounded-full flex items-center justify-center shadow-sm text-xl">+</button>
        </div>
      </header>
      <section id="lp-cards-container">
    `;

    persons.forEach(p => {
      const birth = this.getBirthDateOf(p);
      const life = this.getLifeExpectancyOf(p);
      const progress = LifeProgressEngine.calcProgress(birth, life, nowMs);
      const ageText = progress.hasBirth ? `${progress.age}/${life}` : '未设置生日';
      const percentText = progress.hasBirth ? `${progress.percentage}%` : '0%';
      const barWidth = progress.hasBirth ? progress.percentage : 0;

      html += `
        <div class="lp-card" data-id="${p.id}">
          <div class="lp-card-header">
            <span class="lp-card-name">${this._escapeHtml(p.name)}</span>
            <span class="lp-card-age">${ageText}</span>
          </div>
          <div class="lp-progress-wrap">
            <div class="lp-progress-bar" style="width: ${barWidth}%; background: ${p.color};"></div>
            <span class="lp-progress-text">${percentText}</span>
          </div>
        </div>
      `;
    });

    html += `</section>`;
    container.innerHTML = html;

    // 绑定事件
    const addBtn = document.getElementById('lp-add-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => showView('lifeprogressEdit'));
    }

    container.querySelectorAll('.lp-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.id;
        const person = persons.find(p => p.id === id);
        if (person) showView('lifeprogressEdit', person);
      });
    });
  },

  // ==================== 编辑页渲染 ====================
  renderEdit(person) {
    const container = document.getElementById('lifeprogressEdit-view');
    if (!container) return;

    const target = document.getElementById('lifeprogressEdit-inner');
    if (!target) return;

    const isEdit = !!(person && person.id);
    const isSelf = isEdit && person.id === 'self';
    const title = isEdit ? '编辑' : '添加';

    this._editPersonId = isEdit ? person.id : null;
    this._editColor = (isEdit ? person.color : COLORS[0]) || COLORS[0];

    // 默认值
    let nameVal = isEdit ? person.name : '';
    let birthVal = '';
    let lifeVal = 100;

    if (isEdit) {
      const birth = this.getBirthDateOf(person);
      const life = this.getLifeExpectancyOf(person);
      birthVal = birth || '';
      lifeVal = life;
    }
    this._editBirthDate = birthVal;

    // 构建编辑页 HTML
    let html = `
      <div class="pt-6 pb-4 flex items-center justify-between">
        <button id="lp-edit-back" class="flex items-center gap-2 text-apple-blue font-medium">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
          返回
        </button>
        <span class="font-semibold text-apple-dark dark:text-white">${title}</span>
        <button id="lp-edit-save" class="text-apple-blue font-medium text-sm px-2">保存</button>
      </div>

      <div class="form-group">
        <label class="form-label">称呼</label>
        <input type="text" id="lp-edit-name" class="form-input" value="${this._escapeHtml(nameVal)}" placeholder="如：妈妈">
      </div>

      <div class="form-group">
        <label class="form-label">出生日期</label>
        <div id="lp-inline-picker" class="lp-inline-picker"></div>
      </div>

      <div class="form-group">
        <label class="form-label">目标寿命</label>
        <input type="number" id="lp-edit-life" class="form-input" value="${lifeVal}" min="40" max="150">
      </div>

      <div class="form-group">
        <label class="form-label">主题色</label>
        <div class="color-picker" id="lp-edit-colors">
          ${COLORS.map(c => `
            <span class="color-option ${c === this._editColor ? 'selected' : ''}" data-color="${c}" style="background: ${c}"></span>
          `).join('')}
        </div>
      </div>
    `;

    // 非 isSelf 显示删除按钮
    if (isEdit && !isSelf) {
      html += `
        <div class="form-group" style="margin-top: 2rem;">
          <button id="lp-edit-delete" class="modal-btn modal-btn-danger" style="width: 100%;">删除</button>
        </div>
      `;
    }

    target.innerHTML = html;

    // 渲染内联滚轮
    const pickerContainer = document.getElementById('lp-inline-picker');
    if (pickerContainer) {
      DatePickerManager.renderInline(pickerContainer, birthVal, (dateStr) => {
        this._editBirthDate = dateStr;
      });
    }

    // 绑定颜色选择
    target.querySelectorAll('#lp-edit-colors .color-option').forEach(opt => {
      opt.addEventListener('click', () => {
        this._editColor = opt.dataset.color;
        target.querySelectorAll('#lp-edit-colors .color-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
      });
    });

    // 绑定返回
    document.getElementById('lp-edit-back').addEventListener('click', () => {
      showView('lifeprogress');
    });

    // 绑定保存
    document.getElementById('lp-edit-save').addEventListener('click', () => {
      const name = document.getElementById('lp-edit-name').value.trim();
      const life = parseInt(document.getElementById('lp-edit-life').value, 10);

      if (!name) {
        alert('请输入称呼');
        return;
      }
      if (!Number.isFinite(life) || life < 40 || life > 150) {
        alert('目标寿命需在 40~150 之间');
        return;
      }

      const ok = this.savePerson({
        id: this._editPersonId,
        name,
        birthDate: this._editBirthDate,
        lifeExpectancy: life,
        color: this._editColor
      });

      if (ok) {
        showView('lifeprogress');
      } else {
        alert('保存失败，请检查输入');
      }
    });

    // 绑定删除
    const delBtn = document.getElementById('lp-edit-delete');
    if (delBtn) {
      delBtn.addEventListener('click', () => {
        if (confirm('确定要删除这个人物吗？')) {
          this.deletePerson(this._editPersonId);
          showView('lifeprogress');
        }
      });
    }
  },

  _escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
};
