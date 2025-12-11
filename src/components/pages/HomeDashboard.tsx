'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

type SummaryData = {
  company: { name: string; type: string };
  alerts: Array<{ id: string; title: string; type: string; date: string }>;
  schedules: Array<{ id: string; title: string; dueDate: string }>;
};

type CompanyOption = {
  id: string;
  name: string;
  type: 'corporation' | 'individual' | string;
  isCurrent?: boolean;
};

export default function HomeDashboard() {
  const [data, setData] = useState<SummaryData | null>(null);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      const res = await fetch('/api/home/summary');
      const d = await res.json();
      setData(d);
    };

    const fetchCompanies = async () => {
      const res = await fetch('/api/customer/list');
      if (!res.ok) return;
      const d = await res.json();
      setCompanies(d.companies || []);
    };

    fetchSummary().catch((e) => console.error(e));
    fetchCompanies().catch((e) => console.error(e));
  }, []);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  };

  const isLoading = !data;

  const companyLabel = data
    ? `${data.company.type === 'individual' ? '個人事業主' : '法人'}: ${data.company.name}`
    : '選択中の事業者を取得中...';

  const handleSelectCompany = async (companyId: string) => {
    setSelectingId(companyId);
    try {
      const res = await fetch('/api/customer/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId }),
      });

      if (!res.ok) {
        throw new Error('会社の切り替えに失敗しました');
      }

      const [summaryRes, companyRes] = await Promise.all([
        fetch('/api/home/summary'),
        fetch('/api/customer/list'),
      ]);

      if (summaryRes.ok) {
        setData(await summaryRes.json());
      }
      if (companyRes.ok) {
        const d = await companyRes.json();
        setCompanies(d.companies || []);
      }

      setIsDropdownOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSelectingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">ダッシュボード</p>
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">ホーム</h2>
          <p className="text-sm text-slate-500 leading-relaxed">最新の予定とアップロード状況をチェック</p>
          <div ref={dropdownRef} className="relative inline-flex items-center">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-2 text-[12px] font-semibold text-slate-700 shadow-sm"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              aria-expanded={isDropdownOpen}
              aria-haspopup="listbox"
            >
              <span className="text-slate-500">選択中</span>
              <span className="text-slate-900">{companyLabel}</span>
              <span aria-hidden className="text-xs text-slate-500">▼</span>
            </Button>
            {isDropdownOpen && (
              <div
                className="absolute left-0 top-full z-30 mt-3 w-72 rounded-2xl border border-slate-100 bg-white/95 p-2 shadow-xl ring-1 ring-black/5"
                role="listbox"
                aria-label="会社を切り替える"
              >
                <div className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  利用する会社を変更
                </div>
                {companies.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-slate-500">利用可能な会社がありません</div>
                ) : (
                  <ul className="max-h-56 space-y-1 overflow-auto">
                    {companies.map((company) => {
                      const label = `${company.type === 'individual' ? '個人事業主' : '法人'}: ${company.name}`;
                      const isCurrent = company.isCurrent;
                      const isSelecting = selectingId === company.id;
                      return (
                        <li key={company.id}>
                          <button
                            type="button"
                            className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition hover:bg-slate-50 ${isCurrent ? 'bg-[rgba(144,104,144,0.05)] font-semibold text-[var(--color-primary-plum-800)]' : 'text-slate-800'}`}
                            onClick={() => handleSelectCompany(company.id)}
                            disabled={isSelecting}
                            role="option"
                            aria-selected={isCurrent}
                          >
                            <span className="flex flex-col">
                              <span>{label}</span>
                              {isCurrent && (
                                <span className="text-[11px] font-medium text-[var(--color-primary-plum-700)]">現在選択中</span>
                              )}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {isSelecting ? '切替中...' : isCurrent ? '表示中' : '切り替え'}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <div className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-[12px] text-slate-600">
                  詳細な管理が必要な場合は{' '}
                  <Link href="/selectcompany" className="font-semibold text-[var(--color-primary-plum-700)] underline">
                    会社一覧
                  </Link>
                  へ移動してください。
                </div>
              </div>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          aria-label="ログアウト"
          className="w-full sm:w-auto"
        >
          ログアウト
        </Button>
      </div>

      <Card className="overflow-hidden bg-gradient-to-br from-white via-white to-[rgba(221,160,221,0.08)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">次の提出</p>
            <h3 className="text-lg font-bold text-slate-900">スケジュールを確認しましょう</h3>
            <p className="text-sm text-slate-600">
              期限切れを防ぐための自動リマインダーを有効にしています。
            </p>
          </div>
          <div className="hidden shrink-0 rounded-full bg-[rgba(144,104,144,0.1)] px-4 py-2 text-xs font-semibold text-[var(--color-primary-plum-800)] md:block">
            リアルタイム同期中
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-600">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-[13px] font-semibold text-[var(--color-primary-plum-800)] shadow-sm">
            🔔 アラート {isLoading ? '—' : data.alerts.length}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-[13px] font-semibold text-[var(--color-primary-plum-800)] shadow-sm">
            📅 スケジュール {isLoading ? '—' : data.schedules.length}
          </span>
        </div>
      </Card>

      {/* Notifications */}
      <section className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600">お知らせ</h3>
          <span className="rounded-full bg-white/70 px-3 py-1 text-[11px] font-semibold text-slate-500 shadow-sm">リアルタイム</span>
        </div>
        <div className="space-y-2">
          {isLoading ? (
            Array.from({ length: 2 }).map((_, index) => (
              <Card key={`alert-skeleton-${index}`} className="p-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="mt-2 h-3 w-1/3" />
              </Card>
            ))
          ) : data.alerts.length === 0 ? (
            <Card className="p-4 text-sm text-slate-500">新しいお知らせはありません。</Card>
          ) : (
            data.alerts.map((alert) => (
              <Card key={alert.id} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(240,128,128,0.12)] px-2 py-1 text-[11px] font-semibold text-[var(--color-primary-salmon-800)]">
                      {alert.type}
                    </span>
                    <p className="text-sm font-semibold text-slate-900">{alert.title}</p>
                  </div>
                  <span className="text-xs font-medium text-slate-500 whitespace-nowrap">{alert.date}</span>
                </div>
              </Card>
            ))
          )}
        </div>
      </section>

      {/* Schedule */}
      <section className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600">直近のスケジュール</h3>
            <p className="text-xs text-slate-500">期限が近いタスクを優先的に表示します</p>
          </div>
          <Link
            href="/schedule"
            className="text-[13px] font-semibold text-[var(--color-primary-plum-700)] underline-offset-4 hover:underline"
          >
            すべて見る →
          </Link>
        </div>
        <Card className="p-0 overflow-hidden">
          {isLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={`schedule-skeleton-${index}`} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-3/5" />
                </div>
              ))}
            </div>
          ) : data.schedules.length === 0 ? (
            <div className="p-4 text-sm text-slate-500">予定はありません。</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.schedules.map((sch) => (
                <li key={sch.id} className="group flex items-center justify-between gap-4 p-4 transition-colors duration-150 hover:bg-[rgba(144,104,144,0.04)]">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="default">期限</Badge>
                      <Badge variant="danger">{sch.dueDate}</Badge>
                    </div>
                    <span className="text-sm font-semibold text-slate-900 group-hover:text-[var(--color-primary-plum-800)]">
                      {sch.title}
                    </span>
                  </div>
                  <span aria-hidden className="text-lg text-slate-300">→</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      {/* Quick Actions */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600">クイックアクセス</h3>
          <span className="text-[11px] font-medium text-slate-500">アップロード・設定</span>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { href: '/customer/edit', icon: '🏢', label: '会社情報' },
            { href: '/rating', icon: '📊', label: '決算書' },
            { href: '/trial_balance', icon: '📑', label: '試算表' },
            { href: '/manual', icon: '📘', label: 'マニュアル' },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="focus-visible:outline-none">
              <Card className="flex h-full flex-col items-center justify-center gap-2 rounded-2xl bg-white/90 py-6 text-center transition-transform hover:-translate-y-[3px] focus-within:translate-y-[-3px]">
                <div className="text-3xl" aria-hidden>
                  {item.icon}
                </div>
                <div className="text-sm font-semibold text-slate-800">{item.label}</div>
                <div className="text-[11px] font-medium text-slate-500">開く</div>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
