const PRIVATE_PATH_PREFIXES = [
  '/api/auth',
  '/api/articles',
  '/api/exercises',
  '/api/me',
  '/api/consent-policy',
  '/api/consents',
  '/api/moods',
  '/api/screening',
  '/api/journals',
  '/api/exercise-sessions',
  '/api/tasks',
  '/api/schedule-blocks',
  '/api/reminders',
  '/api/reflections',
  '/api/help-requests',
  '/api/group-feedback',
  '/api/bk',
  '/api/superadmin',
  '/api/exports',
  '/app',
  '/bk',
  '/superadmin',
  '/admin',
];

export function isPublicCacheablePath(pathname) {
  if (!pathname) return false;
  if (PRIVATE_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return false;
  }
  if (pathname.startsWith('/api/')) {
    return pathname === '/api/public/config';
  }
  return (
    pathname === '/' ||
    pathname === '/bantuan' ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/favicon.svg' ||
    pathname.startsWith('/assets/') ||
    pathname.startsWith('/icons/') ||
    pathname.startsWith('/audio/')
  );
}

export async function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  } catch {
    return null;
  }
}

export function notifyServiceWorkerLogout() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    navigator.serviceWorker.controller?.postMessage({ type: 'CLEAR_PRIVATE_STATE' });
  } catch {
    // abaikan jika controller SW belum aktif
  }
}

export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replaceAll('-', '+').replaceAll('_', '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function subscribeToInstallPrompt(onChange) {
  if (typeof window === 'undefined') return () => {};
  let deferred = null;

  function onBeforeInstall(e) {
    e.preventDefault();
    deferred = e;
    onChange(deferred);
  }

  function onInstalled() {
    deferred = null;
    onChange(null);
  }

  window.addEventListener('beforeinstallprompt', onBeforeInstall);
  window.addEventListener('appinstalled', onInstalled);
  return () => {
    window.removeEventListener('beforeinstallprompt', onBeforeInstall);
    window.removeEventListener('appinstalled', onInstalled);
  };
}

export function triggerBlobDownload({ filename, content, mimeType }) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    link.remove();
  }, 500);
}
