/**
 * 统计模块
 */

const StatisticsManager = {
  charts: {},

  renderStatisticsPage() {
    const stats = StorageManager.getOverallStats();

    this._renderReportEntry(); // 新增：报告入口
    this.updateOverviewCards(stats);
    this.renderCompletionChart();
    this.renderCategoryChart();
    this.renderWeeklyChart();
    this.renderRankingList();
  },

  /** 在统计页头部下方插入「生成 AI 人生报告」入口（只插一次） */
  _renderReportEntry() {
    const header = document.querySelector('#statistics-view .stats-page-header');
    if (!header || document.getElementById('stats-report-entry')) return;
    const btn = document.createElement('button');
    btn.id = 'stats-report-entry';
    btn.className = 'report-entry-card';
    btn.innerHTML = `
      <span class="entry-emoji">✨</span>
      <span class="entry-text">
        <span class="entry-title">生成 AI 人生报告</span>
        <span class="entry-sub">让 AI 为你总结这段时光</span>
      </span>`;
    btn.addEventListener('click', () => ReportManager.open());
    header.insertAdjacentElement('afterend', btn);
  },

  updateOverviewCards(stats) {
    document.getElementById('stat-total-completed').textContent = stats.totalCompleted;
    document.getElementById('stat-total-tasks').textContent = stats.totalTasks;
    document.getElementById('stat-completed-lists').textContent = stats.completedLists;
    document.getElementById('stat-today-completed').textContent = stats.todayCompleted;
    document.getElementById('stat-overall-percent').textContent = Math.round(stats.overallPercentage) + '%';
  },

  renderCompletionChart() {
    const ctx = document.getElementById('completion-chart');
    if (!ctx) return;

    if (this.charts.completion) {
      this.charts.completion.destroy();
    }

    const stats = StorageManager.getOverallStats();

    this.charts.completion = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['已完成', '未完成'],
        datasets: [{
          data: [stats.totalCompleted, stats.totalTasks - stats.totalCompleted],
          backgroundColor: ['#34C759', '#E5E5EA'],
          borderWidth: 0,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: '75%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(context) {
                return context.label + ': ' + context.parsed + ' 项';
              }
            }
          }
        }
      }
    });
  },

  renderCategoryChart() {
    const ctx = document.getElementById('category-chart');
    if (!ctx) return;

    if (this.charts.category) {
      this.charts.category.destroy();
    }

    const lists = StorageManager.getLists() || DEFAULT_LISTS;
    const labels = lists.map(l => l.emoji + ' ' + l.title);
    const completedData = lists.map(l => l.tasks.filter(t => t.completed).length);
    const totalData = lists.map(l => l.tasks.length);
    const colors = lists.map(l => l.color);

    this.charts.category = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: '已完成',
            data: completedData,
            backgroundColor: colors.map(c => c + 'CC'),
            borderRadius: 4
          },
          {
            label: '总数',
            data: totalData,
            backgroundColor: colors.map(c => c + '33'),
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        scales: {
          x: {
            stacked: false,
            grid: { display: false },
            ticks: { stepSize: 1 }
          },
          y: { grid: { display: false } }
        },
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 15
            }
          }
        }
      }
    });
  },

  renderWeeklyChart() {
    const ctx = document.getElementById('weekly-chart');
    if (!ctx) return;

    if (this.charts.weekly) {
      this.charts.weekly.destroy();
    }

    const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    const today = new Date().getDay();
    const todayCompleted = StorageManager.getTodayCompleted();

    const data = days.map((_, index) => {
      if (index === (today === 0 ? 6 : today - 1)) {
        return todayCompleted;
      }
      return Math.floor(Math.random() * 3);
    });

    this.charts.weekly = new Chart(ctx, {
      type: 'line',
      data: {
        labels: days,
        datasets: [{
          label: '完成任务数',
          data: data,
          borderColor: '#007AFF',
          backgroundColor: '#007AFF20',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#007AFF',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { display: false } },
          y: {
            beginAtZero: true,
            grid: { color: '#E5E5EA33' },
            ticks: { stepSize: 1 }
          }
        },
        plugins: { legend: { display: false } }
      }
    });
  },

  renderRankingList() {
    const container = document.getElementById('ranking-list');
    if (!container) return;

    const lists = StorageManager.getLists() || DEFAULT_LISTS;

    const ranked = lists.map(list => {
      const progress = StorageManager.calculateListProgress(list);
      return { ...list, progress };
    }).sort((a, b) => b.progress.percentage - a.progress.percentage);

    container.innerHTML = '';

    ranked.forEach((list, index) => {
      const item = document.createElement('div');
      item.className = 'ranking-item';

      let medal = '';
      if (index === 0) medal = '🥇';
      else if (index === 1) medal = '🥈';
      else if (index === 2) medal = '🥉';
      else medal = (index + 1).toString();

      item.innerHTML = `
        <div class="ranking-position">${medal}</div>
        <div class="ranking-emoji" style="background: ${list.color}15">${list.emoji}</div>
        <div class="ranking-info">
          <div class="ranking-title">${list.title}</div>
          <div class="ranking-progress-bar">
            <div class="ranking-progress" style="width: ${list.progress.percentage}%; background: ${list.color}"></div>
          </div>
        </div>
        <div class="ranking-percent">${Math.round(list.progress.percentage)}%</div>
      `;

      container.appendChild(item);
    });
  }
};
