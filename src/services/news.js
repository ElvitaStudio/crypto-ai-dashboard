import axios from 'axios';

const POSITIVE = ['bull', 'surge', 'rally', 'pump', 'high', 'record', 'gain', 'up'];
const NEGATIVE = ['bear', 'crash', 'dump', 'low', 'hack', 'ban', 'sell', 'down', 'fear'];

export function detectSentiment(title = '') {
  const t = title.toLowerCase();
  const pos = POSITIVE.some((w) => t.includes(w));
  const neg = NEGATIVE.some((w) => t.includes(w));
  if (pos && !neg) return 'positive';
  if (neg && !pos) return 'negative';
  return 'neutral';
}

export function aggregateNewsSentiment(news) {
  if (!news?.length) return 'neutral';
  const scores = news.map((n) => {
    if (n.sentiment === 'positive') return 1;
    if (n.sentiment === 'negative') return -1;
    return 0;
  });
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  if (avg > 0.2) return 'positive';
  if (avg < -0.2) return 'negative';
  return 'neutral';
}

export async function fetchCryptoNews(baseSymbol) {
  try {
    const { data } = await axios.get(
      'https://min-api.cryptocompare.com/data/v2/news/',
      {
        params: {
          categories: baseSymbol,
          lang: 'RU',
          sortOrder: 'latest',
        },
      }
    );
    const items = (data?.Data || []).slice(0, 5);
    return items.map((item) => ({
      id: item.id,
      title: item.title || '',
      url: item.url || item.guid,
      source: item.source_info?.name || item.source || 'CryptoCompare',
      publishedAt: item.published_on * 1000,
      sentiment: detectSentiment(item.title),
    }));
  } catch {
    return [];
  }
}

export function formatTimeAgo(timestamp) {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}м назад`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}ч назад`;
  return `${Math.floor(hours / 24)}д назад`;
}
