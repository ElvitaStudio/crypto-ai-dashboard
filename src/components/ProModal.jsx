import { useState, useEffect } from 'react';
import { getTimeUntilReset } from '../store/userLimits';

export default function ProModal({ isOpen, onClose, onOpenPayment }) {
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    if (!isOpen) return undefined;
    const tick = () => {
      const t = getTimeUntilReset();
      setCountdown(t?.formatted || '00:00:00');
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          background: '#0d1520',
          border: '1px solid #1e2433',
          borderRadius: '16px',
          padding: '24px',
          maxWidth: '320px',
          width: '100%',
          position: 'relative',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            background: 'none',
            border: 'none',
            color: '#4a5568',
            fontSize: 20,
            cursor: 'pointer',
          }}
        >
          ✕
        </button>

        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🔒</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>
            Лимит исчерпан
          </div>
          <div style={{ fontSize: 12, color: '#4a5568', marginTop: 6 }}>
            Бесплатный план: 1 анализ каждые 24 часа
          </div>
          <div
            style={{
              marginTop: 10,
              padding: '10px 16px',
              background: '#1e2433',
              borderRadius: 8,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 10, color: '#4a5568', marginBottom: 4 }}>
              СЛЕДУЮЩИЙ БЕСПЛАТНЫЙ АНАЛИЗ ЧЕРЕЗ
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: '#fbbf24',
                fontFamily: 'monospace',
                letterSpacing: 2,
              }}
            >
              {countdown}
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #1e2433', margin: '16px 0' }} />

        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: '#e2e8f0',
              marginBottom: 12,
              textAlign: 'center',
            }}
          >
            ⚡ Crypto AI Pro
          </div>
          {[
            '✅ Безлимитный AI анализ',
            '✅ Премиум сигналы в Telegram',
            '✅ Авто-сканер топовых монет',
            '✅ Push уведомления ',
            '✅ Приоритетный доступ к новым функциям',
          ].map((item) => (
            <div
              key={item}
              style={{
                fontSize: 12,
                color: '#94a3b8',
                marginBottom: 6,
                paddingLeft: 4,
              }}
            >
              {item}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenPayment?.();
          }}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #1d4ed8, #7c3aed)',
            border: 'none',
            borderRadius: 8,
            color: 'white',
            fontSize: 14,
            fontWeight: 600,
            padding: '12px',
            cursor: 'pointer',
            marginBottom: 8,
          }}
        >
          Узнать о Pro →
        </button>

        <div style={{ textAlign: 'center', fontSize: 10, color: '#2d3748' }}>
          Скоро • Следите за обновлениями
        </div>
      </div>
    </div>
  );
}
