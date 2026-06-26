/**
 * 动画效果模块
 */

const AnimationManager = {
  createConfetti(element) {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];

    for (let i = 0; i < 30; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.style.left = centerX + 'px';
      confetti.style.top = centerY + 'px';
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];

      const size = Math.random() * 8 + 4;
      confetti.style.width = size + 'px';
      confetti.style.height = size + 'px';

      if (Math.random() > 0.5) {
        confetti.style.borderRadius = '50%';
      }

      document.body.appendChild(confetti);

      const angle = Math.random() * Math.PI * 2;
      const velocity = Math.random() * 200 + 100;
      const targetX = Math.cos(angle) * velocity;
      const targetY = Math.sin(angle) * velocity - 100;

      confetti.animate([
        { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
        { transform: `translate(${targetX}px, ${targetY}px) rotate(${Math.random() * 720}deg)`, opacity: 0 }
      ], {
        duration: Math.random() * 1000 + 800,
        easing: 'cubic-bezier(0, 0.9, 0.57, 1)',
        fill: 'forwards'
      });

      setTimeout(() => confetti.remove(), 2000);
    }
  },

  createCheckAnimation(checkbox) {
    const wrapper = checkbox.closest('.task-checkbox-wrapper');
    if (!wrapper) return;

    const customCheckbox = wrapper.querySelector('.checkbox-custom');
    if (!customCheckbox) return;

    customCheckbox.animate([
      { transform: 'scale(1)' },
      { transform: 'scale(1.3)' },
      { transform: 'scale(0.9)' },
      { transform: 'scale(1.1)' },
      { transform: 'scale(1)' }
    ], {
      duration: 400,
      easing: 'ease-out'
    });
  },

  animateNumber(element, startValue, endValue, duration = 1000) {
    const startTime = performance.now();

    const update = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = this.easeOutCubic(progress);
      const currentValue = startValue + (endValue - startValue) * easedProgress;

      element.textContent = Math.round(currentValue);

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    };

    requestAnimationFrame(update);
  },

  animateFloatNumber(element, startValue, endValue, duration = 1000) {
    const startTime = performance.now();

    const update = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = this.easeOutCubic(progress);
      const currentValue = startValue + (endValue - startValue) * easedProgress;

      element.textContent = currentValue.toFixed(1);

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    };

    requestAnimationFrame(update);
  },

  animateCircularProgress(circle, percentage, duration = 1500) {
    const radius = circle.r.baseVal.value;
    const circumference = 2 * Math.PI * radius;

    circle.style.strokeDasharray = `${circumference} ${circumference}`;
    circle.style.strokeDashoffset = circumference;
    circle.getBoundingClientRect();

    const offset = circumference - (percentage / 100) * circumference;
    circle.style.transition = `stroke-dashoffset ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
    circle.style.strokeDashoffset = offset;
  },

  animateCardEntrance(card, delay = 0) {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';

    setTimeout(() => {
      card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, delay);
  },

  animateBadgeUnlock(badge) {
    badge.animate([
      { transform: 'scale(0) rotate(-180deg)', opacity: 0 },
      { transform: 'scale(1.2) rotate(10deg)', opacity: 1 },
      { transform: 'scale(0.9) rotate(-5deg)', opacity: 1 },
      { transform: 'scale(1.05) rotate(2deg)', opacity: 1 },
      { transform: 'scale(1) rotate(0deg)', opacity: 1 }
    ], {
      duration: 600,
      easing: 'ease-out',
      fill: 'forwards'
    });
  },

  createShakeEffect(element) {
    element.animate([
      { transform: 'translateX(0)' },
      { transform: 'translateX(-5px)' },
      { transform: 'translateX(5px)' },
      { transform: 'translateX(-3px)' },
      { transform: 'translateX(3px)' },
      { transform: 'translateX(0)' }
    ], {
      duration: 400,
      easing: 'ease-out'
    });
  },

  createFireworks(x, y) {
    const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1'];
    const particleCount = 20;

    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'firework-particle';
      particle.style.left = x + 'px';
      particle.style.top = y + 'px';
      particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];

      document.body.appendChild(particle);

      const angle = (Math.PI * 2 / particleCount) * i;
      const velocity = Math.random() * 100 + 50;
      const targetX = Math.cos(angle) * velocity;
      const targetY = Math.sin(angle) * velocity;

      particle.animate([
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        { transform: `translate(${targetX}px, ${targetY}px) scale(0)`, opacity: 0 }
      ], {
        duration: 600,
        easing: 'ease-out',
        fill: 'forwards'
      });

      setTimeout(() => particle.remove(), 700);
    }
  },

  easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }
};
