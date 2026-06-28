/**
 * 存储管理模块
 */

const StorageManager = {
  KEYS: {
    BIRTH_DATE: 'life_checklist_birth_date',
    LISTS_DATA: 'life_checklist_lists_data',
    TIMELINE: 'life_checklist_timeline',
    ACHIEVEMENTS: 'life_checklist_achievements',
    TODAY_COMPLETED: 'life_checklist_today_completed',
    TODAY_DATE: 'life_checklist_today_date',
    ADDED_TEMPLATES: 'life_checklist_added_templates',
    STREAK_DATA: 'life_checklist_streak_data',
    LAST_VISIT: 'life_checklist_last_visit',
    RECOMMENDATIONS_CACHE: 'life_checklist_recommendations_cache',
    LIFE_EXPECTANCY: 'life_checklist_life_expectancy',
    LIST_ORDER: 'life_checklist_list_order',
    PERSONS: 'life_checklist_persons',
    TIMELINE_LAYOUT: 'life_checklist_timeline_layout',
    TIMELINE_MIGRATED: 'life_checklist_timeline_migrated'
  },

  getBirthDate() {
    return localStorage.getItem(this.KEYS.BIRTH_DATE);
  },

  setBirthDate(dateStr) {
    localStorage.setItem(this.KEYS.BIRTH_DATE, dateStr);
  },

  getLifeExpectancy() {
    const v = parseInt(localStorage.getItem(this.KEYS.LIFE_EXPECTANCY), 10);
    return Number.isFinite(v) && v > 0 ? v : DEFAULT_LIFE_EXPECTANCY;
  },

  setLifeExpectancy(years) {
    localStorage.setItem(this.KEYS.LIFE_EXPECTANCY, String(years));
  },

  getRetireAge() {
    const v = parseInt(localStorage.getItem(this.KEYS.RETIRE_AGE), 10);
    return Number.isFinite(v) && v > 0 ? v : DEFAULT_RETIRE_AGE;
  },

  setRetireAge(age) {
    localStorage.setItem(this.KEYS.RETIRE_AGE, String(age));
  },

  getLists() {
    const data = localStorage.getItem(this.KEYS.LISTS_DATA);
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
        console.error('解析清单数据失败:', e);
        return null;
      }
    }
    return null;
  },

  setLists(lists) {
    localStorage.setItem(this.KEYS.LISTS_DATA, JSON.stringify(lists));
  },

  getTimeline() {
    const data = localStorage.getItem(this.KEYS.TIMELINE);
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
        return [];
      }
    }
    return [];
  },

  setTimeline(timeline) {
    localStorage.setItem(this.KEYS.TIMELINE, JSON.stringify(timeline));
  },

  addTimelineEvent(event) {
    const timeline = this.getTimeline();
    timeline.unshift(event);
    this.setTimeline(timeline);
  },

  removeTimelineEvent(eventId) {
    const timeline = this.getTimeline();
    const filtered = timeline.filter(e => e.id !== eventId);
    this.setTimeline(filtered);
  },

  getAddedTemplates() {
    const data = localStorage.getItem(this.KEYS.ADDED_TEMPLATES);
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
        return [];
      }
    }
    return [];
  },

  addTemplate(templateId) {
    const added = this.getAddedTemplates();
    if (!added.includes(templateId)) {
      added.push(templateId);
      localStorage.setItem(this.KEYS.ADDED_TEMPLATES, JSON.stringify(added));
    }
  },

  setAddedTemplates(templateIds) {
    localStorage.setItem(this.KEYS.ADDED_TEMPLATES, JSON.stringify(templateIds || []));
  },

  getStreakData() {
    const data = localStorage.getItem(this.KEYS.STREAK_DATA);
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
        return this.getDefaultStreakData();
      }
    }
    return this.getDefaultStreakData();
  },

  getDefaultStreakData() {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastCheckDate: null,
      todayChecked: false
    };
  },

  setStreakData(data) {
    localStorage.setItem(this.KEYS.STREAK_DATA, JSON.stringify(data));
  },

  updateStreak() {
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    const streakData = this.getStreakData();

    // 如果是新的一天
    if (streakData.lastCheckDate !== today) {
      streakData.todayChecked = false;

      // 如果昨天没有打卡，连续天数重置
      if (streakData.lastCheckDate !== yesterday) {
        streakData.currentStreak = 0;
      }

      streakData.lastCheckDate = today;
      this.setStreakData(streakData);
    }

    return streakData;
  },

  checkInToday() {
    const streakData = this.updateStreak();

    if (!streakData.todayChecked) {
      streakData.currentStreak++;
      streakData.todayChecked = true;

      if (streakData.currentStreak > streakData.longestStreak) {
        streakData.longestStreak = streakData.currentStreak;
      }

      this.setStreakData(streakData);
    }

    return streakData;
  },

  isTodayChecked() {
    const streakData = this.updateStreak();
    return streakData.todayChecked;
  },

  updateLastVisit() {
    localStorage.setItem(this.KEYS.LAST_VISIT, new Date().toISOString());
  },

  removeTemplate(templateId) {
    const added = this.getAddedTemplates();
    const index = added.indexOf(templateId);
    if (index > -1) {
      added.splice(index, 1);
      localStorage.setItem(this.KEYS.ADDED_TEMPLATES, JSON.stringify(added));
    }
  },

  isTemplateAdded(templateId) {
    return this.getAddedTemplates().includes(templateId);
  },

  updateTaskStatus(listId, taskId, completed) {
    let lists = this.getLists();
    if (!lists) {
      lists = JSON.parse(JSON.stringify(DEFAULT_LISTS));
    }

    const list = lists.find(l => l.id === listId);
    if (list) {
      const task = list.tasks.find(t => t.id === taskId);
      if (task) {
        task.completed = completed;
        if (completed) {
          task.completedDate = new Date().toISOString().split('T')[0];
          this.incrementTodayCompleted();

          // 更新连续打卡
          this.checkInToday();
        } else {
          task.completedDate = '';
        }

        this.setLists(lists);
      }
    }

    return lists;
  },

  getTodayCompleted() {
    const today = new Date().toDateString();
    const savedDate = localStorage.getItem(this.KEYS.TODAY_DATE);

    if (savedDate !== today) {
      localStorage.setItem(this.KEYS.TODAY_DATE, today);
      localStorage.setItem(this.KEYS.TODAY_COMPLETED, '0');
      return 0;
    }

    return parseInt(localStorage.getItem(this.KEYS.TODAY_COMPLETED) || '0');
  },

  incrementTodayCompleted() {
    const today = new Date().toDateString();
    const savedDate = localStorage.getItem(this.KEYS.TODAY_DATE);

    if (savedDate !== today) {
      localStorage.setItem(this.KEYS.TODAY_DATE, today);
      localStorage.setItem(this.KEYS.TODAY_COMPLETED, '1');
    } else {
      const current = parseInt(localStorage.getItem(this.KEYS.TODAY_COMPLETED) || '0');
      localStorage.setItem(this.KEYS.TODAY_COMPLETED, (current + 1).toString());
    }
  },

  getUnlockedAchievements() {
    const data = localStorage.getItem(this.KEYS.ACHIEVEMENTS);
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
        return [];
      }
    }
    return [];
  },

  unlockAchievement(achievementId) {
    const unlocked = this.getUnlockedAchievements();
    if (!unlocked.includes(achievementId)) {
      unlocked.push(achievementId);
      localStorage.setItem(this.KEYS.ACHIEVEMENTS, JSON.stringify(unlocked));
      return true;
    }
    return false;
  },

  calculateLifeProgress(birthDateStr, lifeExpectancy = DEFAULT_LIFE_EXPECTANCY) {
    if (!birthDateStr) return 0;

    const birthDate = new Date(birthDateStr);
    const now = new Date();
    const livedDays = Math.floor((now - birthDate) / (1000 * 60 * 60 * 24));
    const totalDays = lifeExpectancy * 365.25;
    const percentage = (livedDays / totalDays) * 100;

    return Math.min(100, Math.max(0, percentage));
  },

  calculateListProgress(list) {
    const total = list.tasks.length;
    const completed = list.tasks.filter(t => t.completed).length;
    const percentage = total > 0 ? (completed / total) * 100 : 0;

    return { completed, total, percentage };
  },

  getOverallStats() {
    const lists = this.getLists() || DEFAULT_LISTS;
    const streakData = this.getStreakData();
    let totalTasks = 0;
    let totalCompleted = 0;
    let completedLists = 0;

    lists.forEach(list => {
      const progress = this.calculateListProgress(list);
      totalTasks += progress.total;
      totalCompleted += progress.completed;
      if (progress.percentage === 100) {
        completedLists++;
      }
    });

    return {
      totalTasks,
      totalCompleted,
      completedLists,
      overallPercentage: totalTasks > 0 ? (totalCompleted / totalTasks) * 100 : 0,
      todayCompleted: this.getTodayCompleted(),
      templateListsAdded: this.getAddedTemplates().length,
      totalLists: lists.length,
      longestStreak: streakData.longestStreak
    };
  },

  checkAchievements() {
    const stats = this.getOverallStats();
    const newAchievements = [];

    ACHIEVEMENTS.forEach(achievement => {
      if (achievement.condition(stats)) {
        const isNew = this.unlockAchievement(achievement.id);
        if (isNew) {
          newAchievements.push(achievement);
        }
      }
    });

    return newAchievements;
  },

  getListOrder() {
    const data = localStorage.getItem(this.KEYS.LIST_ORDER);
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
        return [];
      }
    }
    return [];
  },

  setListOrder(order) {
    localStorage.setItem(this.KEYS.LIST_ORDER, JSON.stringify(order || []));
  },

  getPersons() {
    const data = localStorage.getItem(this.KEYS.PERSONS);
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
        return [];
      }
    }
    return [];
  },

  setPersons(persons) {
    localStorage.setItem(this.KEYS.PERSONS, JSON.stringify(persons || []));
  },

  getTimelineLayout() {
    return localStorage.getItem(this.KEYS.TIMELINE_LAYOUT) || 'single';
  },

  setTimelineLayout(layout) {
    localStorage.setItem(this.KEYS.TIMELINE_LAYOUT, layout);
  },

  isTimelineMigrated() {
    return localStorage.getItem(this.KEYS.TIMELINE_MIGRATED) === 'true';
  },

  setTimelineMigrated() {
    localStorage.setItem(this.KEYS.TIMELINE_MIGRATED, 'true');
  },

  initializeData() {
    if (!this.getLists()) {
      const lists = JSON.parse(JSON.stringify(DEFAULT_LISTS));
      this.setLists(lists);
    }
    // 一次性迁移旧时间轴数据
    this._migrateTimelineOnce();
  },

  _migrateTimelineOnce() {
    if (this.isTimelineMigrated()) return;
    try {
      const old = this.getTimeline();
      if (old.length > 0 && old.some(e => e && ('date' in e || 'title' in e))) {
        const migrated = TimelineEngine.migrate(old);
        this.setTimeline(migrated);
      }
      this.setTimelineMigrated();
    } catch (e) {
      console.error('时间轴迁移失败:', e);
    }
  }
};
