'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

export default function LoginForm() {
  const router = useRouter();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginId, password }),
      });

      if (res.ok) {
        router.push('/selectcompany');
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || 'ログインに失敗しました');
      }
    } catch {
      setError('予期せぬエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <Card className="w-full max-w-md space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-blue-900">CLAS-Z</h1>
          <p className="text-slate-500 mt-2 text-sm">アカウントにログイン</p>
        </div>
        
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="ログインID"
            type="text"
            required
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            placeholder="例: admin"
          />

          <Input
            label="パスワード"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />

          <Button type="submit" isLoading={loading} className="w-full">
            ログイン
          </Button>
        </form>
        
        <div className="text-xs text-center text-slate-400 mt-4">
           デモ用: admin / password
        </div>
      </Card>
    </div>
  );
}
