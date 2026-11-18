import React, { useEffect, useState } from 'react';
import { Download, WifiOff, RefreshCw } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useT } from '../i18n';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const ua = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    install,
  };
}

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const t = useT();

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-800 transition-colors whitespace-nowrap shrink-0"
      >
        <Download className="w-3.5 h-3.5" />
        <span>{t.common.installApp}</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{t.common.installApp}</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                iPhone / iPad ga o'rnatish
              </h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                1. Safari pastki panelidan <strong>Ulashish (Share)</strong> tugmasini bosing.
                <br />
                2. <strong>Asosiy ekranga qo'shish (Add to Home Screen)</strong> bandini tanlang.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-lg bg-slate-900 dark:bg-teal-700 py-2.5 text-sm font-medium text-white hover:opacity-90"
              >
                {t.common.close}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useAppStore((s) => s.isOnline);
  const syncStatus = useAppStore((s) => s.syncStatus);
  const pendingCount = useAppStore((s) => s.db?.offlineQueue.length ?? 0);
  const syncOfflineQueue = useAppStore((s) => s.syncOfflineQueue);
  const notify = useAppStore((s) => s.notify);
  const t = useT();

  if (isOnline && pendingCount === 0 && syncStatus !== 'syncing') return null;

  return (
    <div className="no-print fixed bottom-20 md:bottom-4 left-4 z-50 flex items-center gap-2.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/95 px-3 py-2 text-xs font-medium text-amber-900 dark:text-amber-100 shadow-lg">
      {!isOnline ? (
        <>
          <WifiOff className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>{t.common.offline}</span>
        </>
      ) : syncStatus === 'syncing' ? (
        <>
          <RefreshCw className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 animate-spin shrink-0" />
          <span>{t.common.syncing}</span>
        </>
      ) : (
        <>
          <span>
            {t.common.syncPending}: {pendingCount}
          </span>
          <button
            type="button"
            onClick={async () => {
              const count = await syncOfflineQueue();
              notify(`${count} ta yozuv sinxronlandi`, 'success');
            }}
            className="inline-flex items-center gap-1 rounded bg-amber-600 px-2 py-1 text-[11px] text-white hover:bg-amber-700"
          >
            <RefreshCw className="w-3 h-3" />
            {t.common.syncNow}
          </button>
        </>
      )}
    </div>
  );
};
