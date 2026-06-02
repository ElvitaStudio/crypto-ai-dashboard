export default function AppHeader({ lastRefresh, onRefresh, isConnected }) {
  return (
    <header className="header">
      <div className="header-left">
        <span className="live-dot" />
        <span className="logo">CRYPTO AI</span>
        <span className="badge-live">LIVE</span>
        {isConnected && <span className="ws-status">●</span>}
      </div>
      <div className="header-right">
        <span className="last-update">
          {lastRefresh.toLocaleTimeString('ru-RU')}
        </span>
        <button type="button" className="btn-refresh" onClick={onRefresh}>
          ⟳ Обновить
        </button>
      </div>
    </header>
  );
}
