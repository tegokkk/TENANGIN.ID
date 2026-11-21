import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import styles from './States.module.css';

export function OfflineBanner() {
  const [offline, setOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className={styles.offlineBar} role="status" aria-live="polite">
      <WifiOff size={16} aria-hidden="true" />
      <span>
        Koneksi terputus. Perubahan pribadi tidak diklaim tersimpan sebelum terhubung ke server.
      </span>
    </div>
  );
}
