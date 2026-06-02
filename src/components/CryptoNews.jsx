import { useState, useEffect, useCallback } from 'react';
import { fetchCryptoNews, formatTimeAgo, aggregateNewsSentiment } from '../services/news';

const SENTIMENT_ICON = {
  positive: '🟢',
  negative: '🔴',
  neutral: '⚪',
};

export default function CryptoNews({ symbol, onMetrics }) {
  const [news, setNews] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);
  const baseSymbol = symbol.replace('USDT', '');

  const load = useCallback(async () => {
    const items = await fetchCryptoNews(baseSymbol);
    setNews(items);
    setLastUpdate(new Date());
    onMetrics?.({
      newsSentiment: aggregateNewsSentiment(items),
      newsCount: items.length,
    });
  }, [baseSymbol, onMetrics]);

  useEffect(() => {
    load();
    const id = setInterval(load, 15 * 60 * 1000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <div className="widget-card crypto-news">
      <div className="widget-header">
        <h3 className="widget-title">НОВОСТИ · {baseSymbol}</h3>
        {lastUpdate && (
          <span className="widget-sub">
            {lastUpdate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
      {news.length === 0 ? (
        <p className="news-empty">Нет свежих новостей</p>
      ) : (
        <ul className="news-list">
          {news.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="news-item"
                onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')}
              >
                <p className="news-title">
                  {SENTIMENT_ICON[item.sentiment]} {item.title}
                </p>
                <span className="news-meta">
                  {item.source} · {formatTimeAgo(item.publishedAt)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
