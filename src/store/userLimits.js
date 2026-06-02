const OWNER_ID = '191320017';
const FREE_LIMIT = 1;
const RESET_HOURS = 24;

export function getTelegramUserId() {
  try {
    if (window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
      return String(window.Telegram.WebApp.initDataUnsafe.user.id);
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function isOwner() {
  return getTelegramUserId() === OWNER_ID;
}

export function canRunAnalysis() {
  if (isOwner()) return { allowed: true, isOwner: true };

  const userId = getTelegramUserId();
  const key = `analysis_${userId || 'guest'}`;

  try {
    const data = localStorage.getItem(key);
    if (!data) return { allowed: true, remaining: FREE_LIMIT };

    const { count, resetAt } = JSON.parse(data);

    if (Date.now() > resetAt) {
      localStorage.removeItem(key);
      return { allowed: true, remaining: FREE_LIMIT };
    }

    if (count >= FREE_LIMIT) {
      const hoursLeft = Math.ceil((resetAt - Date.now()) / 3600000);
      const minutesLeft = Math.ceil((resetAt - Date.now()) / 60000);
      return {
        allowed: false,
        hoursLeft,
        minutesLeft,
        resetAt,
      };
    }

    return { allowed: true, remaining: FREE_LIMIT - count };
  } catch {
    return { allowed: true, remaining: FREE_LIMIT };
  }
}

export function recordAnalysisUsage() {
  if (isOwner()) return;

  const userId = getTelegramUserId();
  const key = `analysis_${userId || 'guest'}`;

  try {
    const data = localStorage.getItem(key);
    const resetAt = Date.now() + RESET_HOURS * 3600000;

    if (!data) {
      localStorage.setItem(key, JSON.stringify({ count: 1, resetAt }));
      return;
    }

    const parsed = JSON.parse(data);
    if (Date.now() > parsed.resetAt) {
      localStorage.setItem(key, JSON.stringify({ count: 1, resetAt }));
    } else {
      localStorage.setItem(
        key,
        JSON.stringify({
          ...parsed,
          count: parsed.count + 1,
        })
      );
    }
  } catch {
    /* ignore */
  }
}

export function saveTelegramUser(userId, chatId) {
  try {
    const users = JSON.parse(localStorage.getItem('tg_users') || '[]');
    if (!users.find((u) => u.userId === userId)) {
      users.push({ userId, chatId, registeredAt: Date.now() });
      localStorage.setItem('tg_users', JSON.stringify(users));
    }
  } catch {
    /* ignore */
  }
}

export function getTimeUntilReset() {
  const userId = getTelegramUserId();
  const key = `analysis_${userId || 'guest'}`;
  try {
    const data = localStorage.getItem(key);
    if (!data) return null;
    const { resetAt } = JSON.parse(data);
    const diff = resetAt - Date.now();
    if (diff <= 0) return null;
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return {
      total: diff,
      formatted: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
    };
  } catch {
    return null;
  }
}

export function getResetTime(userId) {
  const key = `analysis_${userId || 'guest'}`;
  try {
    const data = localStorage.getItem(key);
    if (!data) return null;
    return JSON.parse(data).resetAt;
  } catch {
    return null;
  }
}

export function getTelegramUsers() {
  try {
    return JSON.parse(localStorage.getItem('tg_users') || '[]');
  } catch {
    return [];
  }
}

export function getServerProStatus() {
  try {
    const data = localStorage.getItem('server_pro_status');
    if (!data) return false;
    const { isPro, expiresAt, checkedAt } = JSON.parse(data);
    if (Date.now() - checkedAt > 30 * 60 * 1000) return false;
    if (!isPro || !expiresAt) return false;
    return new Date(expiresAt) > new Date();
  } catch {
    return false;
  }
}
