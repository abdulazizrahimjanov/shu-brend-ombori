import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ShoppingCart, AlertTriangle, Sparkles, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { formatMoney, formatShortMoney, useT } from '../i18n';

export const DashboardPage: React.FC = () => {
  const db = useAppStore((s) => s.db);
  const can = useAppStore((s) => s.can);
  const activeStoreId = useAppStore((s) => s.activeStoreId);
  const language = useAppStore((s) => s.language);
  const getVariantStock = useAppStore((s) => s.getVariantStock);
  const setShowOnboarding = useAppStore((s) => s.setShowOnboarding);
  const t = useT();
  const navigate = useNavigate();

  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('month');
  const canViewProfit = can('view_profit_cost');
  const canViewFinance = can('view_finance');

  const analytics = useMemo(() => {
    if (!db) return null;
    const now = new Date();
    const startCurrent = new Date(now);
    const startPrev = new Date(now);

    if (period === 'today') {
      startCurrent.setHours(0, 0, 0, 0);
      startPrev.setDate(startPrev.getDate() - 1);
      startPrev.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
      startCurrent.setDate(startCurrent.getDate() - 7);
      startPrev.setDate(startPrev.getDate() - 14);
    } else {
      startCurrent.setDate(startCurrent.getDate() - 30);
      startPrev.setDate(startPrev.getDate() - 60);
    }

    const storeSales = db.sales.filter(
      (s) =>
        s.status !== 'returned' &&
        s.status !== 'deferred' &&
        (activeStoreId === 'all' || s.storeId === activeStoreId)
    );

    const curSales = storeSales.filter((s) => new Date(s.createdAt) >= startCurrent);
    const prevSales = storeSales.filter(
      (s) => new Date(s.createdAt) >= startPrev && new Date(s.createdAt) < startCurrent
    );

    const revenue = curSales.reduce((sum, s) => sum + s.totalAmount, 0);
    const prevRevenue = prevSales.reduce((sum, s) => sum + s.totalAmount, 0);
    const cost = curSales.reduce((sum, s) => sum + s.costTotal, 0);
    const profit = revenue - cost;
    const prevProfit = prevRevenue - prevSales.reduce((sum, s) => sum + s.costTotal, 0);
    const count = curSales.length;
    const prevCount = prevSales.length;
    const avgCheck = count > 0 ? Math.round(revenue / count) : 0;
    const prevAvgCheck = prevCount > 0 ? Math.round(prevRevenue / prevCount) : 0;

    const pctDelta = (cur: number, prev: number) => {
      if (prev <= 0) return cur > 0 ? 100 : 0;
      return Math.round(((cur - prev) / prev) * 100);
    };

    // Sales by hour (09:00 to 21:00)
    const hourBuckets = Array.from({ length: 13 }, (_, i) => ({
      hour: `${String(9 + i).padStart(2, '0')}:00`,
      total: 0,
    }));
    curSales.forEach((s) => {
      const h = new Date(s.createdAt).getHours();
      const idx = h - 9;
      if (idx >= 0 && idx < hourBuckets.length) {
        hourBuckets[idx].total += s.totalAmount;
      }
    });

    // Top Products
    const prodMap = new Map<string, { name: string; qty: number; total: number }>();
    curSales.forEach((s) =>
      s.items.forEach((it) => {
        const prev = prodMap.get(it.productId) ?? { name: it.productName, qty: 0, total: 0 };
        prev.qty += it.qty;
        prev.total += it.lineTotal;
        prodMap.set(it.productId, prev);
      })
    );
    const topProducts = [...prodMap.values()].sort((a, b) => b.total - a.total).slice(0, 5);

    // Top Cashiers
    const cashierMap = new Map<string, { name: string; count: number; total: number }>();
    curSales.forEach((s) => {
      const prev = cashierMap.get(s.cashierId) ?? { name: s.cashierName, count: 0, total: 0 };
      prev.count += 1;
      prev.total += s.totalAmount;
      cashierMap.set(s.cashierId, prev);
    });
    const topCashiers = [...cashierMap.values()].sort((a, b) => b.total - a.total).slice(0, 4);

    // Low stock alerts
    const lowStock: { productName: string; variantLabel: string; qty: number; min: number }[] = [];
    db.products.forEach((p) =>
      p.variants.forEach((v) => {
        const q = getVariantStock(v.id);
        if (q <= v.minStock) {
          lowStock.push({
            productName: p.name,
            variantLabel: [v.size, v.color].filter(Boolean).join(' / ') || v.sku,
            qty: q,
            min: v.minStock,
          });
        }
      })
    );

    return {
      revenue,
      revenueDelta: pctDelta(revenue, prevRevenue),
      profit,
      profitDelta: pctDelta(profit, prevProfit),
      count,
      countDelta: pctDelta(count, prevCount),
      avgCheck,
      avgDelta: pctDelta(avgCheck, prevAvgCheck),
      hourBuckets,
      topProducts,
      topCashiers,
      lowStock: lowStock.slice(0, 6),
      lowStockTotalCount: lowStock.length,
    };
  }, [db, period, activeStoreId, getVariantStock]);

  if (!db || !analytics) return null;

  const cashBalanceTotal = db.accounts.reduce((s, a) => s + a.balance, 0);
  const customerDebts = db.debts.reduce((s, d) => s + d.remainingAmount, 0);
  const supplierDebts = db.suppliers.reduce((s, sup) => s + sup.debtBalance, 0);
  const showUsd = db.settings.showUsdOption;
  const usdRate = db.settings.usdRate;

  const kpis = [
    {
      label: t.dashboard.revenue,
      value: formatMoney(analytics.revenue, { showUSD: showUsd, usdRate, lang: language }),
      delta: analytics.revenueDelta,
    },
    ...(canViewProfit
      ? [
          {
            label: t.dashboard.profit,
            value: formatMoney(analytics.profit, { showUSD: showUsd, usdRate, lang: language }),
            delta: analytics.profitDelta,
          },
        ]
      : []),
    {
      label: t.dashboard.salesCount,
      value: String(analytics.count),
      delta: analytics.countDelta,
    },
    {
      label: t.dashboard.avgCheck,
      value: formatMoney(analytics.avgCheck, { lang: language }),
      delta: analytics.avgDelta,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Top Action & Period Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-lg">
          {(['today', 'week', 'month'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                period === p
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {p === 'today' ? t.common.today : p === 'week' ? t.common.week : t.common.month}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowOnboarding(true)}
            className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
            <span>{t.dashboard.startOnboarding}</span>
          </button>
          {can('use_pos') && (
            <button
              type="button"
              onClick={() => navigate('/pos')}
              className="h-9 px-4 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>{t.dashboard.openPos}</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4"
          >
            <div className="text-xs text-slate-500 dark:text-slate-400">{k.label}</div>
            <div className="font-mono tabular-nums text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-1.5 truncate">
              {k.value}
            </div>
            <div
              className={`mt-1.5 inline-flex items-center gap-1 text-[11px] font-mono font-medium ${
                k.delta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
              }`}
            >
              {k.delta >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              <span>{k.delta >= 0 ? `+${k.delta}%` : `${k.delta}%`}</span>
              <span className="text-slate-400 font-sans">· {t.dashboard.vsPrev}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Chart + Cash/Debts Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5">
          <h2 className="font-display text-sm font-bold mb-4">{t.dashboard.salesByHour}</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.hourBuckets} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0F766E" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0F766E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} />
                <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(v) => (v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : `${Math.round(v / 1000)}K`)}
                  width={48}
                />
                <Tooltip
                  formatter={(value: unknown) => [formatMoney(Number(value), { lang: language }), t.dashboard.revenue]}
                  contentStyle={{
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#0F766E"
                  strokeWidth={2}
                  fill="url(#tealGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-4">
          {canViewFinance && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2.5">
              <div className="text-xs font-semibold text-slate-500">{t.dashboard.cashBalance}</div>
              <div className="font-mono tabular-nums text-xl font-bold text-slate-900 dark:text-white">
                {formatShortMoney(cashBalanceTotal, language)}
              </div>
              <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
                {db.accounts.map((a) => (
                  <div key={a.id} className="flex justify-between">
                    <span className="text-slate-500 truncate">{a.name}</span>
                    <span className="font-mono tabular-nums font-medium">{formatMoney(a.balance, { lang: language })}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2.5">
            <div className="text-xs font-semibold text-slate-500">{t.dashboard.debtsSummary}</div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-600 dark:text-slate-300">{t.dashboard.customerDebts}</span>
              <span className="font-mono font-bold text-teal-700 dark:text-teal-400">
                +{formatMoney(customerDebts, { lang: language })}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-600 dark:text-slate-300">{t.dashboard.supplierDebts}</span>
              <span className="font-mono font-bold text-red-600">
                -{formatMoney(supplierDebts, { lang: language })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom 3 Columns: Top Products, Top Cashiers, Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <h3 className="font-display text-sm font-bold mb-3">{t.dashboard.topProducts}</h3>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {analytics.topProducts.length === 0 ? (
              <div className="py-6 text-center text-slate-400">{t.common.emptyTitle}</div>
            ) : (
              analytics.topProducts.map((p, i) => (
                <div key={i} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{p.name}</div>
                    <div className="text-slate-400 font-mono">{p.qty} dona</div>
                  </div>
                  <div className="font-mono font-bold whitespace-nowrap">{formatMoney(p.total, { lang: language })}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <h3 className="font-display text-sm font-bold mb-3">{t.dashboard.topCashiers}</h3>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {analytics.topCashiers.length === 0 ? (
              <div className="py-6 text-center text-slate-400">{t.common.emptyTitle}</div>
            ) : (
              analytics.topCashiers.map((c, i) => (
                <div key={i} className="py-2.5 flex items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold">{c.name}</div>
                    <div className="text-slate-400 font-mono">{c.count} ta chek</div>
                  </div>
                  <div className="font-mono font-bold whitespace-nowrap">{formatMoney(c.total, { lang: language })}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-sm font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>{t.dashboard.lowStockAlerts} ({analytics.lowStockTotalCount})</span>
            </h3>
            <button
              type="button"
              onClick={() => navigate('/inventory')}
              className="text-xs text-teal-700 dark:text-teal-400 font-semibold hover:underline"
            >
              Ombor
            </button>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {analytics.lowStock.length === 0 ? (
              <div className="py-6 text-center text-slate-400">Barcha tovarlar yetarli</div>
            ) : (
              analytics.lowStock.map((l, i) => (
                <div key={i} className="py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{l.productName}</div>
                    <div className="text-slate-400 truncate">{l.variantLabel}</div>
                  </div>
                  <div className="font-mono font-bold text-amber-600 whitespace-nowrap">
                    {l.qty} / min {l.min}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
