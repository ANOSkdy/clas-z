'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

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
      .then(res => res.json())
      .then(data => {
        setItems(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-4 text-slate-500">読み込み中...</div>;

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const isDone = item.status === 'done';
        
        return (
          <Card key={item.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={item.category === 'tax' ? 'default' : 'success'}>
                  {item.category === 'tax' ? '税務' : '社保'}
                </Badge>
                {item.status === 'overdue' && <Badge variant="danger">期限切れ</Badge>}
              </div>
              <h3 className={`font-bold text-base ${isDone ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                {item.title}
              </h3>
              <p className="text-sm text-slate-500 mt-1">期限: {item.dueDate}</p>
            </div>
            <div>
              {isDone ? (
                <Badge variant="outline">完了</Badge>
              ) : (
                <Badge variant="warning">要対応</Badge>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
