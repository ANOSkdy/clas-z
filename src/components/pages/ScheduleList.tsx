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

  const renderSkeleton = () => (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, idx) => (
        <Card key={`skeleton-${idx}`}>
          <div className="mb-2 flex items-center gap-2">
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="mt-2 h-3 w-1/3" />
        </Card>
      ))}
    </div>
  );

  if (loading) return renderSkeleton();

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const isDone = item.status === 'done';
        const isOverdue = item.status === 'overdue';

        return (
          <Card key={item.id} className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant={item.category === 'tax' ? 'default' : 'success'}>
                  {item.category === 'tax' ? '税務' : '社保'}
                </Badge>
                {isOverdue && <Badge variant="danger">期限切れ</Badge>}
                {isDone && <Badge variant="outline">完了</Badge>}
              </div>
              <h3 className={`text-base font-bold ${isDone ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                {item.title}
              </h3>
              <p className="text-sm text-slate-500">期限: {item.dueDate}</p>
            </div>
            <div className="flex items-center gap-2">
              {isDone ? (
                <Badge variant="outline">完了</Badge>
              ) : isOverdue ? (
                <Badge variant="danger">要対応</Badge>
              ) : (
                <Badge variant="warning">進行中</Badge>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
