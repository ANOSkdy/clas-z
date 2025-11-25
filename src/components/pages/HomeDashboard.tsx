'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

type SummaryData = {
  alerts: Array<{ id: string; title: string; type: string; date: string }>;
  schedules: Array<{ id: string; title: string; dueDate: string }>;
};

export default function HomeDashboard() {
  const [data, setData] = useState<SummaryData | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/home/summary')
      .then((res) => res.json())
      .then((d) => setData(d))
      .catch((e) => console.error(e));
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800">ホーム</h2>
        <button onClick={handleLogout} className="text-sm text-slate-500 hover:text-red-600 underline">
          ログアウト
        </button>
      </div>

      {/* Notifications */}
      <section>
        <h3 className="text-sm font-bold text-slate-500 mb-2 uppercase tracking-wider">お知らせ</h3>
        <div className="space-y-2">
          {!data ? (
            <p className="text-slate-500 text-sm">読み込み中...</p>
          ) : data.alerts.length === 0 ? (
            <p className="text-slate-500 text-sm">新しいお知らせはありません。</p>
          ) : (
            data.alerts.map((alert) => (
              <div key={alert.id} className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm flex justify-between items-start gap-2">
                <span className="text-slate-800">{alert.title}</span>
                <span className="text-slate-500 text-xs whitespace-nowrap">{alert.date}</span>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Schedule */}
      <section>
        <div className="flex justify-between items-end mb-2">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">直近のスケジュール</h3>
          <Link href="/schedule" className="text-blue-600 text-xs hover:underline font-medium">
            すべて見る &rarr;
          </Link>
        </div>
        <Card className="p-0 overflow-hidden">
          {!data ? (
            <div className="p-4 text-sm text-slate-500">読み込み中...</div>
          ) : data.schedules.length === 0 ? (
            <div className="p-4 text-sm text-slate-500">予定はありません。</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.schedules.map((sch) => (
                <li key={sch.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                  <span className="font-medium text-slate-800 text-sm">{sch.title}</span>
                  <Badge variant="danger">{sch.dueDate}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      {/* Quick Actions */}
      <section className="grid grid-cols-2 gap-4">
        <Link href="/customer/edit">
          <Card className="text-center hover:bg-slate-50 transition-colors h-full flex flex-col justify-center items-center gap-2 py-6">
            <div className="text-2xl">🏢</div>
            <div className="text-sm font-bold text-slate-700">会社情報</div>
          </Card>
        </Link>
        <Link href="/rating">
          <Card className="text-center hover:bg-slate-50 transition-colors h-full flex flex-col justify-center items-center gap-2 py-6">
            <div className="text-2xl">📊</div>
            <div className="text-sm font-bold text-slate-700">決算書</div>
          </Card>
        </Link>
        <Link href="/trial_balance">
          <Card className="text-center hover:bg-slate-50 transition-colors h-full flex flex-col justify-center items-center gap-2 py-6">
            <div className="text-2xl">📑</div>
            <div className="text-sm font-bold text-slate-700">試算表</div>
          </Card>
        </Link>
        <Link href="/manual">
          <Card className="text-center hover:bg-slate-50 transition-colors h-full flex flex-col justify-center items-center gap-2 py-6">
            <div className="text-2xl">📘</div>
            <div className="text-sm font-bold text-slate-700">マニュアル</div>
          </Card>
        </Link>
      </section>
    </div>
  );
}
