'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';

type RatingResult = {
  grade: string;
  score: number;
  comment: string;
};

export default function RatingUploadPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<RatingResult | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const upRes = await fetch('/api/rating/upload', {
        method: 'POST',
        body: formData,
      });

      if (!upRes.ok) throw new Error('Upload failed');
      const { fileId } = await upRes.json();

      const finRes = await fetch('/api/rating/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId }),
      });

      const data = await finRes.json();
      setResult(data);
    } catch (_error) {
      alert('エラーが発生しました');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="space-y-6">
        <div
          className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${dragActive ? 'border-[var(--color-primary-plum-700)] bg-[rgba(221,160,221,0.06)]' : 'border-[rgba(17,17,17,0.12)] bg-[rgba(144,104,144,0.02)]'}`}
          onDragEnter={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragActive(false);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            const droppedFile = e.dataTransfer.files?.[0];
            if (droppedFile) setFile(droppedFile);
          }}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(144,104,144,0.1)] text-2xl">⬆️</div>
          <div>
            <p className="text-base font-semibold text-slate-900">決算書をドロップまたは選択</p>
            <p className="text-sm text-slate-600">PDF または CSV (最大 4MB) を安全にアップロード</p>
          </div>
          <label className="cursor-pointer rounded-full bg-white px-4 py-2 text-sm font-semibold text-[var(--color-primary-plum-800)] shadow-[0_10px_30px_-16px_rgba(108,78,108,0.2)] transition-all duration-200 ease-out hover:-translate-y-0.5">
            ファイルを選択
            <input
              type="file"
              accept=".pdf,.csv"
              className="sr-only"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>
          {file && (
            <p className="text-sm font-semibold text-[var(--color-primary-plum-800)]" aria-live="polite">
              選択中: {file.name}
            </p>
          )}
        </div>

        <Button onClick={handleUpload} disabled={!file || uploading} isLoading={uploading} className="w-full" aria-live="polite">
          {uploading ? '解析中...' : 'アップロード・格付開始'}
        </Button>
      </Card>

      {uploading && (
        <Card className="space-y-3" aria-busy>
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-20 w-full" />
        </Card>
      )}

      {result && (
        <Card className="bg-gradient-to-br from-white to-[rgba(144,104,144,0.05)] border-[rgba(144,104,144,0.2)]">
          <div className="mb-4 flex items-center gap-4">
            <div className="text-4xl font-black text-[var(--color-primary-plum-800)]">{result.grade}</div>
            <div className="text-sm text-slate-600">
              スコア: <span className="font-bold text-slate-900">{result.score}</span>
            </div>
          </div>
          <div className="text-sm leading-relaxed text-slate-800">
            <Badge className="mb-2">AIコメント</Badge>
            <p>{result.comment}</p>
          </div>
        </Card>
      )}
    </div>
  );
}
