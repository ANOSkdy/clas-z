'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

type SummaryData = {
  alerts: Array<{ id: string; title: string; type: string; date: string }>;
  schedules: Array<{ id: string; title: string; dueDate: string }>;
};

export default function HomeDashboard() {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/home/summary')
      .then((res) => res.json())
      .then((d) => setData(d))
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  };

  const alertPlaceholder = (
    <div className="space-y-2" aria-busy>
      {[...Array(2)].map((_, idx) => (
        <Skeleton key={idx} className="h-12 w-full" />
      ))}
    </div>
  );

  const schedulePlaceholder = (
    <Card className="p-0">
      <ul className="divide-y divide-slate-100">
        {[...Array(3)].map((_, idx) => (
          <li key={idx} className="p-4">
            <Skeleton className="mb-2 h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </li>
        ))}
      </ul>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">ダッシュボード</p>
          <h2 className="text-xl font-bold text-slate-900">ホーム</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout} aria-label="ログアウト">
          ログアウト
        </Button>
      </div>

      <Card className="relative overflow-hidden border-none bg-gradient-to-br from-[rgba(221,160,221,0.16)] via-white to-[rgba(240,128,128,0.12)]">
        <div className="absolute right-2 top-2 h-20 w-20 rounded-full bg-[rgba(144,104,144,0.08)] blur-2xl" aria-hidden />
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm font-semibold text-[var(--color-primary-plum-800)]">ようこそ</p>
            <h3 className="text-lg font-bold text-slate-900 leading-tight">税務・労務・会計の予定と提出物をまとめて確認</h3>
            <p className="text-sm text-slate-600 mt-2">アップロードや期日が重なる週も、スケジュールとAIのガイドで迷わず進められます。</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="tab-pill bg-white text-[var(--color-primary-plum-800)] shadow-sm">
              自動スケジュール連携
            </Badge>
            <Badge className="tab-pill bg-white text-[var(--color-primary-plum-800)] shadow-sm">
              アップロード管理
            </Badge>
            <Badge className="tab-pill bg-white text-[var(--color-primary-plum-800)] shadow-sm">
              スマホ最適化
            </Badge>
          </div>
        </div>
      </Card>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold tracking-wide text-slate-700">お知らせ</h3>
          <span className="text-xs font-medium text-slate-500">リアルタイム更新</span>
        </div>
        {!data && loading && alertPlaceholder}
        {data && data.alerts.length === 0 && (
          <div className="rounded-lg border border-dashed border-[rgba(144,104,144,0.4)] bg-[rgba(144,104,144,0.04)] p-4 text-sm text-slate-600">
            新しいお知らせはありません。
          </div>
        )}
        {data && data.alerts.length > 0 && (
          <div className="space-y-3">
            {data.alerts.map((alert) => (
              <div
                key={alert.id}
                className="interactive-transition flex items-start justify-between gap-3 rounded-lg border border-[rgba(17,17,17,0.05)] bg-white/90 px-4 py-3 shadow-[0_10px_30px_-16px_rgba(108,78,108,0.18)]"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 h-9 w-9 rounded-xl bg-[rgba(240,128,128,0.12)] text-lg">📌</div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{alert.title}</p>
                    <p className="text-xs text-slate-500">{alert.type}</p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-slate-500">{alert.date}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold tracking-wide text-slate-700">直近のスケジュール</h3>
          <Link href="/schedule" className="text-xs font-semibold text-[var(--color-primary-plum-800)] underline-offset-4 hover:underline">
            すべて見る ↗
          </Link>
        </div>
        {!data && loading && schedulePlaceholder}
        {data && data.schedules.length === 0 && (
          <Card className="text-sm text-slate-600">予定はありません。</Card>
        )}
        {data && data.schedules.length > 0 && (
          <Card className="p-0">
            <ul className="divide-y divide-slate-100">
              {data.schedules.map((sch) => (
                <li
                  key={sch.id}
                  className="interactive-transition flex items-center justify-between gap-3 p-4 hover:bg-[rgba(144,104,144,0.04)]"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{sch.title}</p>
                    <p className="text-xs text-slate-500">{sch.dueDate}</p>
                  </div>
                  <Badge variant="danger" className="rounded-full bg-[rgba(144,104,144,0.08)] text-[var(--color-primary-plum-800)]">
                    期日
                  </Badge>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { href: '/customer/edit', icon: '🏢', title: '会社情報', desc: '最新の住所・担当者に更新' },
          { href: '/rating', icon: '📊', title: '決算書', desc: 'PDF/CSV を安全に共有' },
          { href: '/trial_balance', icon: '📑', title: '試算表', desc: '共有とメール送付' },
          { href: '/manual', icon: '📘', title: 'マニュアル', desc: '手順の確認' },
        ].map((action) => (
          <Link key={action.href} href={action.href} className="focus:outline-none">
            <Card className="h-full text-left">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgba(144,104,144,0.1)] text-xl">
                  {action.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{action.title}</p>
                  <p className="text-xs text-slate-500">{action.desc}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  );
}
