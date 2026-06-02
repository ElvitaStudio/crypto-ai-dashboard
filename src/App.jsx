import { useState, useEffect } from 'react';
import HomePage from './pages/HomePage';
import DetailPage from './pages/DetailPage';
import PaymentPage from './pages/PaymentPage';
import { registerUser, checkProStatus } from './services/paymentApi';

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedCoin, setSelectedCoin] = useState('BTCUSDT');
  const [pageDirection, setPageDirection] = useState('forward');
  const [serverProStatus, setServerProStatus] = useState(false);

  useEffect(() => {
    const initApp = async () => {
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
        window.Telegram.WebApp.setHeaderColor('#080b12');
        window.Telegram.WebApp.setBackgroundColor('#080b12');
      }

      const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
      if (tgUser) {
        await registerUser(tgUser);
        const status = await checkProStatus(String(tgUser.id));

        if (status.isPro) {
          setServerProStatus(true);
          localStorage.setItem(
            'server_pro_status',
            JSON.stringify({
              isPro: true,
              expiresAt: status.expiresAt,
              checkedAt: Date.now(),
            })
          );
        } else {
          setServerProStatus(false);
          localStorage.removeItem('server_pro_status');
        }
      }
    };
    initApp();

    const interval = setInterval(async () => {
      const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
      if (tgUser) {
        const status = await checkProStatus(String(tgUser.id));
        setServerProStatus(status.isPro);
        if (status.isPro) {
          localStorage.setItem(
            'server_pro_status',
            JSON.stringify({
              isPro: true,
              expiresAt: status.expiresAt,
              checkedAt: Date.now(),
            })
          );
        }
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const handleOpenCoin = (symbol) => {
    setSelectedCoin(symbol);
    setPageDirection('forward');
    setCurrentPage('detail');
    window.scrollTo(0, 0);
  };

  const handleBack = () => {
    setPageDirection('back');
    setCurrentPage('home');
    window.scrollTo(0, 0);
  };

  const pageClass =
    pageDirection === 'forward' ? 'page-enter-forward' : 'page-enter-back';

  return (
    <div
      style={{
        background: '#080b12',
        minHeight: '100vh',
        maxWidth: 480,
        margin: '0 auto',
        overflow: 'hidden',
      }}
    >
      <div key={currentPage} className={pageClass}>
        {currentPage === 'home' && <HomePage onOpenCoin={handleOpenCoin} />}
        {currentPage === 'detail' && (
          <DetailPage
            symbol={selectedCoin}
            onBack={handleBack}
            serverProStatus={serverProStatus}
            onOpenPayment={() => {
              setPageDirection('forward');
              setCurrentPage('payment');
              window.scrollTo(0, 0);
            }}
          />
        )}
        {currentPage === 'payment' && (
          <PaymentPage
            onBack={() => setCurrentPage('home')}
            onSuccess={() => setCurrentPage('home')}
          />
        )}
      </div>
    </div>
  );
}
