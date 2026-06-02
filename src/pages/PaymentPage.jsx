import { useState } from 'react';
import { createPayment } from '../services/paymentApi';

const PRICE_1M = 19.99;
const PRICE_3M = 16.99; // -15%, итого $50.97
const PRICE_6M = 14.99; // -25%, итого $89.94

const WALLETS = {
  TRC20: 'TSagcELBycpN6PX95KTLTB1VVzNJD7wqYo',
  ERC20: '0x36c5296909929643280619b8f95400b3e1a0b61b',
  BEP20: '0x36c5296909929643280619b8f95400b3e1a0b61b',
};

const PLANS = {
  '1m': {
    label: '1 месяц',
    priceMonthly: PRICE_1M,
    totalUsdt: '19.99',
    stars: '~1000',
  },
  '3m': {
    label: '3 месяца',
    priceMonthly: PRICE_3M,
    totalUsdt: '50.97',
    stars: '~2550',
    badge: '🔥 -15%',
    badgeColor: '#ef5350',
  },
  '6m': {
    label: '6 месяцев',
    priceMonthly: PRICE_6M,
    totalUsdt: '89.94',
    stars: '~4500',
    badge: '💎 -25%',
    badgeColor: '#fbbf24',
  },
};

const NETWORK_HINTS = {
  TRC20: '✅ Рекомендуем · Комиссия ~$1',
  ERC20: '⚠️ Высокая комиссия ~$5-20',
  BEP20: '✅ Низкая комиссия ~$0.5',
};

const INCLUDED = [
  '⚡ Безлимитный AI анализ',
  '🔔 Сигналы авто-сканера в Telegram',
  '⏱ Авто-сканер каждые 5 минут',
  '📊 Все индикаторы и инструменты',
  '🆕 Ранний доступ к новым функциям',
];

function RadioMark({ checked }) {
  return (
    <div
      style={{
        width: 18,
        height: 18,
        borderRadius: '50%',
        border: checked ? '2px solid #3b82f6' : '2px solid #4a5568',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {checked && (
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: '#3b82f6',
          }}
        />
      )}
    </div>
  );
}

export default function PaymentPage({ onBack }) {
  const [selectedPlan, setSelectedPlan] = useState('3m');
  const [selectedMethod, setSelectedMethod] = useState('crypto');
  const [selectedNetwork, setSelectedNetwork] = useState('TRC20');
  const [copied, setCopied] = useState(false);

  const plan = PLANS[selectedPlan];
  const wallet = WALLETS[selectedNetwork];

  const handleNetworkSelect = async (network) => {
    setSelectedNetwork(network);
    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (tgUser) {
      await createPayment(String(tgUser.id), selectedPlan, network);
    }
  };

  const handleCopyAddress = () => {
    navigator.clipboard
      .writeText(wallet)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
  };

  const cardStyle = (isSelected) => ({
    background: isSelected ? '#1e2433' : '#0d1520',
    border: isSelected ? '2px solid #3b82f6' : '1px solid #1e2433',
    borderRadius: 12,
    padding: '14px 16px',
    marginBottom: 12,
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
    color: '#e2e8f0',
  });

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#080b12',
        color: '#e2e8f0',
        padding: 16,
      }}
    >
      <header
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr auto',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            fontSize: 14,
            cursor: 'pointer',
            padding: 0,
            justifySelf: 'start',
          }}
        >
          ← Назад
        </button>
        <h1
          style={{
            fontSize: 16,
            fontWeight: 700,
            margin: 0,
            textAlign: 'center',
          }}
        >
          ⚡ Crypto AI Pro
        </h1>
        <div style={{ width: 48 }} />
      </header>

      {Object.entries(PLANS).map(([id, item]) => {
        const isSelected = selectedPlan === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setSelectedPlan(id)}
            style={cardStyle(isSelected)}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{item.label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>
                  ${item.priceMonthly.toFixed(2)}{' '}
                  <span style={{ fontSize: 11, fontWeight: 400, color: '#94a3b8' }}>
                    / мес
                  </span>
                </div>
                {item.totalUsdt !== '19.99' && (
                  <div style={{ fontSize: 10, color: '#4a5568', marginTop: 4 }}>
                    итого ${item.totalUsdt}
                  </div>
                )}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                {item.badge && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: item.badgeColor,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.badge}
                  </span>
                )}
                <RadioMark checked={isSelected} />
              </div>
            </div>
          </button>
        );
      })}

      <div
        style={{
          background: '#0d1520',
          border: '1px solid #1e2433',
          borderRadius: 12,
          padding: 16,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontSize: 9,
            letterSpacing: 2,
            color: '#4a5568',
            marginBottom: 8,
            textTransform: 'uppercase',
          }}
        >
          Что включено в Pro:
        </div>
        {INCLUDED.map((item, index) => (
          <div
            key={item}
            style={{
              fontSize: 13,
              color: '#e2e8f0',
              padding: '6px 0',
              borderBottom:
                index < INCLUDED.length - 1 ? '1px solid #1e2433' : 'none',
            }}
          >
            {item}
          </div>
        ))}
      </div>

      <div
        style={{
          background: '#0d1520',
          border: '1px solid #1e2433',
          borderRadius: 12,
          padding: 16,
          marginBottom: 12,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
          Способ оплаты
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          {[
            { id: 'stars', label: '⭐ Telegram Stars' },
            { id: 'crypto', label: '💎 USDT Крипто' },
          ].map((method) => {
            const isActive = selectedMethod === method.id;
            return (
              <button
                key={method.id}
                type="button"
                onClick={() => setSelectedMethod(method.id)}
                style={{
                  flex: 1,
                  background: isActive ? '#1d4ed8' : '#0d1520',
                  border: isActive ? '1px solid #3b82f6' : '1px solid #1e2433',
                  borderRadius: 10,
                  padding: '12px 8px',
                  color: '#e2e8f0',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {method.label}
              </button>
            );
          })}
        </div>

        {selectedMethod === 'stars' && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
              ⭐ Оплата через Telegram Stars
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
              Расчёт (приблизительно):
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>
              1$ ≈ 50 Stars
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
              Итого: {plan.stars} Stars
            </div>
            <button
              type="button"
              onClick={() =>
                alert(
                  'Оплата через Telegram Stars будет доступна в ближайшем обновлении! 🚀'
                )
              }
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
              }}
            >
              ⭐ Оплатить Stars
            </button>
          </div>
        )}

        {selectedMethod === 'crypto' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              {['TRC20', 'ERC20', 'BEP20'].map((net) => {
                const isActive = selectedNetwork === net;
                return (
                  <button
                    key={net}
                    type="button"
                    onClick={() => handleNetworkSelect(net)}
                    style={{
                      flex: 1,
                      background: isActive ? '#1d4ed8' : '#1e2433',
                      border: isActive ? '1px solid #3b82f6' : '1px solid #2d3748',
                      borderRadius: 8,
                      padding: '8px 6px',
                      color: '#e2e8f0',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {net}
                  </button>
                );
              })}
            </div>

            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 16 }}>
              {NETWORK_HINTS[selectedNetwork]}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div
                style={{
                  background: '#ffffff',
                  padding: 8,
                  borderRadius: 8,
                  display: 'inline-block',
                }}
              >
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(wallet)}`}
                  alt="QR код кошелька"
                  style={{ width: 180, height: 180, borderRadius: 8, display: 'block' }}
                />
              </div>
            </div>

            <div
              style={{
                fontFamily: 'monospace',
                fontSize: 11,
                color: '#94a3b8',
                wordBreak: 'break-all',
                background: '#0d1117',
                border: '1px solid #1e2433',
                borderRadius: 6,
                padding: 10,
                marginTop: 8,
              }}
            >
              {wallet}
            </div>

            <button
              type="button"
              onClick={handleCopyAddress}
              style={{
                width: '100%',
                background: '#1e2433',
                border: '1px solid #2d3748',
                borderRadius: 8,
                color: '#e2e8f0',
                fontSize: 13,
                fontWeight: 600,
                padding: '10px',
                cursor: 'pointer',
                marginTop: 8,
              }}
            >
              {copied ? '✅ Скопировано!' : '📋 Скопировать адрес'}
            </button>

            <div
              style={{
                background: '#0a0e16',
                border: '1px solid #26a69a',
                borderRadius: 8,
                padding: 14,
                marginTop: 12,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 11, color: '#4a5568' }}>К ОПЛАТЕ</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: '#e2e8f0' }}>
                {plan.totalUsdt} USDT
              </div>
              <div style={{ fontSize: 11, color: '#4a5568', marginTop: 4 }}>
                Сеть: {selectedNetwork}
              </div>
            </div>

            <div
              style={{
                background: '#26a69a11',
                border: '1px solid #26a69a44',
                borderRadius: 8,
                padding: 12,
                marginTop: 12,
                fontSize: 12,
                color: '#26a69a',
                textAlign: 'center',
                lineHeight: 1.6,
              }}
            >
              ✅ Активация автоматическая
              <br />
              Обычно 1-5 минут после отправки.
              <br />
              Уведомление придёт в Telegram.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
