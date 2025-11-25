'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';

type ScheduleItem = {
  id: string;
  title: string;
  dueDate: string;
  status: 'pending' | 'done' | 'overdue';
  category: 'tax' | 'social';
};

export default function ScheduleList() {
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/schedule/list')
      .then((res) => res.json())
      .then((data) => {
        setItems(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const skeletons = (
    <div className="space-y-4" aria-busy>
      {[...Array(4)].map((_, idx) => (
        <Card key={idx} className="p-4">
          <Skeleton className="mb-3 h-4 w-24" />
          <Skeleton className="h-3 w-32" />
        </Card>
      ))}
    </div>
  );

  if (loading) return skeletons;

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const isDone = item.status === 'done';
        const isOverdue = item.status === 'overdue';

        return (
          <Card
            key={item.id}
            className="flex flex-col gap-4 border-[rgba(17,17,17,0.08)] bg-white/95 md:flex-row md:items-center md:justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant={item.category === 'tax' ? 'default' : 'success'}>
                  {item.category === 'tax' ? '税務' : '社保'}
                </Badge>
                {isOverdue && (
                  <Badge variant="danger" className="rounded-full bg-[rgba(220,38,38,0.12)] text-[var(--color-danger)]">
                    期限切れ
                  </Badge>
                )}
              </div>
              <h3 className={`text-base font-bold ${isDone ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                {item.title}
              </h3>
              <p className="text-sm text-slate-600">期限: {item.dueDate}</p>
            </div>
            <div className="flex items-center justify-end gap-2">
              {isDone ? (
                <Badge variant="outline" className="rounded-full border-[rgba(17,17,17,0.14)] text-slate-700">
                  完了
                </Badge>
              ) : (
                <Badge variant={isOverdue ? 'danger' : 'warning'} className="rounded-full">
                  {isOverdue ? '至急' : '要対応'}
                </Badge>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
