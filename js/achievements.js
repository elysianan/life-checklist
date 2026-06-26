/**
 * 成就模块
 */

const AchievementManager = {
  showUnlockPopup(achievement) {
    const overlay = document.createElement('div');
    overlay.className = 'achievement-overlay';
    overlay.innerHTML = `
      <div class="achievement-popup">
        <div class="achievement-popup-header">
          <span class="achievement-popup-emoji">🎉</span>
          <h3>成就解锁！</h3>
        </div>
        <div class="achievement-badge-large">
          <span class="badge-emoji">${achievement.emoji}</span>
        </div>
        <h4 class="achievement-title">${achievement.title}</h4>
        <p class="achievement-description">${achievement.description}</p>
        <button class="achievement-close-btn">太棒了！</button>
      </div>
    `;

    document.body.appendChild(overlay);

    const popup = overlay.querySelector('.achievement-popup');
    popup.style.animation = 'achievementPopupIn 0.5s ease forwards';

    const rect = popup.getBoundingClientRect();
    AnimationManager.createFireworks(rect.left + rect.width / 2, rect.top);

    const closeBtn = overlay.querySelector('.achievement-close-btn');
    closeBtn.addEventListener('click', () => {
      popup.style.animation = 'achievementPopupOut 0.3s ease forwards';
      setTimeout(() => overlay.remove(), 300);
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        popup.style.animation = 'achievementPopupOut 0.3s ease forwards';
        setTimeout(() => overlay.remove(), 300);
      }
    });
  },

  showMultipleUnlock(achievements) {
    if (achievements.length === 0) return;

    achievements.forEach((achievement, index) => {
      setTimeout(() => {
        this.showUnlockPopup(achievement);
        SoundManager.playAchievement();
      }, index * 1500);
    });
  },

  renderAchievementWall(container) {
    const unlockedIds = StorageManager.getUnlockedAchievements();

    container.innerHTML = '';

    ACHIEVEMENTS.forEach(achievement => {
      const isUnlocked = unlockedIds.includes(achievement.id);

      const badge = document.createElement('div');
      badge.className = `achievement-badge ${isUnlocked ? 'unlocked' : 'locked'}`;

      badge.innerHTML = `
        <div class="badge-icon ${isUnlocked ? 'badge-unlocked' : 'badge-locked'}">
          <span class="badge-emoji">${isUnlocked ? achievement.emoji : '🔒'}</span>
        </div>
        <div class="badge-info">
          <h4 class="badge-title">${isUnlocked ? achievement.title : '???'}</h4>
          <p class="badge-desc">${isUnlocked ? achievement.description : '继续努力解锁'}</p>
        </div>
      `;

      container.appendChild(badge);

      if (isUnlocked) {
        AnimationManager.animateCardEntrance(badge, ACHIEVEMENTS.indexOf(achievement) * 100);
      }
    });
  },

  getStats() {
    const unlockedIds = StorageManager.getUnlockedAchievements();
    return {
      unlocked: unlockedIds.length,
      total: ACHIEVEMENTS.length,
      percentage: (unlockedIds.length / ACHIEVEMENTS.length) * 100
    };
  }
};
