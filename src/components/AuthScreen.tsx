import React, { useState } from 'react';
import { Phone, Lock, ArrowRight, Globe, Sun, Moon, Store as StoreIcon } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useT } from '../i18n';
import { PWAInstallButton } from './PWAInstallButton';

export const AuthScreen: React.FC<{ onOpenCatalog?: () => void }> = ({ onOpenCatalog }) => {
  const db = useAppStore((s) => s.db);
  const loginWithPhone = useAppStore((s) => s.loginWithPhone);
  const loginAsDemoUser = useAppStore((s) => s.loginAsDemoUser);
  const language = useAppStore((s) => s.language);
  const setLanguage = useAppStore((s) => s.setLanguage);
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const t = useT();

  const [phone, setPhone] = useState('+998901112233');
  const [password, setPassword] = useState('123456');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const ok = loginWithPhone(phone, password);
    if (!ok) {
      setError(t.auth.invalidCredentials);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-between p-4 md:p-8">
      <div className="flex items-center justify-between max-w-6xl w-full mx-auto">
        <div className="flex items-center gap-3">
          <img src="/icon.svg" alt="SHU BREND OMBOR" className="w-9 h-9 rounded-lg" />
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
            SHU BREND OMBOR
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onOpenCatalog && (
            <button
              type="button"
              onClick={onOpenCatalog}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              <StoreIcon className="w-3.5 h-3.5" />
              <span>{t.nav.storefront}</span>
            </button>
          )}
          <PWAInstallButton />
          <button
            type="button"
            onClick={() => setLanguage(language === 'uz' ? 'ru' : 'uz')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{language.toUpperCase()}</span>
          </button>
          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="max-w-5xl w-full mx-auto my-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 flex flex-col justify-between">
          <div>
            <p className="text-xs font-medium text-teal-700 dark:text-teal-400">
              {language === 'uz' ? 'Chakana savdo va ombor platformasi' : 'Платформа розничной торговли и склада'}
            </p>
            <h1 className="mt-2 font-display text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              {t.auth.loginTitle}
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t.auth.loginSubtitle}</p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  {t.auth.phone}
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                    placeholder="+998901112233"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  {t.auth.password}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                    placeholder="••••••"
                    required
                  />
                </div>
              </div>

              {error && (
                <p className="text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="w-full h-11 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <span>{t.auth.signIn}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          <p className="mt-6 text-xs text-slate-500 dark:text-slate-400">
            {language === 'uz'
              ? "Barcha demo akkauntlar uchun standart parol: 123456"
              : 'Пароль по умолчанию для всех демо-аккаунтов: 123456'}
          </p>
        </div>

        <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 flex flex-col justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              {t.auth.quickRoleLogin}
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {language === 'uz'
                ? 'Har bir rol uchun ruxsatlar va interfeysni darhol sinab ko\'ring.'
                : 'Протестируйте права доступа и интерфейс для каждой роли в один клик.'}
            </p>

            <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
              {db?.users.filter((u) => u.isActive).map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => loginAsDemoUser(u.id)}
                  className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">{u.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                      {(db?.roles.find((rl) => rl.id === u.roleId)?.[language === 'ru' ? 'nameRu' : 'nameUz'] ??
                        t.auth.roles[u.roleId as keyof typeof t.auth.roles] ??
                        u.roleId)}{' '}
                      · {u.phone} · PIN {u.pin}
                      {u.customPermissions ? ' · Maxsus huquq' : ''}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
            <span>30+ mahsulot (o'lcham/rang)</span>
            <span>·</span>
            <span>20 mijoz va nasiya</span>
            <span>·</span>
            <span>2 do'kon / 2 ombor</span>
            <span>·</span>
            <span>PWA Oflayn</span>
          </div>
        </div>
      </div>

      <div className="text-center text-xs text-slate-400 dark:text-slate-600">
        SHU BREND OMBOR · O'zbekiston chakana savdo tizimi
      </div>
    </div>
  );
};
