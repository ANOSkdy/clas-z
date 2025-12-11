'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export default function RatingUploadPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);

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

    } catch (e) {
      alert('エラーが発生しました');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="space-y-6">
        <div className="rounded-lg border-2 border-dashed border-slate-300 p-5 text-center transition-colors hover:bg-slate-50 sm:p-8">
          <input
            type="file"
            accept=".pdf,.csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-full file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
          />
          <p className="mt-2 text-xs text-slate-400">PDF または CSV (最大 4MB)</p>
        </div>

        <Button
          onClick={handleUpload}
          disabled={!file || uploading}
          isLoading={uploading}
          className="w-full"
        >
          {uploading ? '解析中...' : 'アップロード・格付開始'}
        </Button>
      </Card>

      {result && (
        <Card className="bg-slate-50 border-blue-100">
          <div className="mb-4 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-4">
            <div className="text-4xl font-bold text-blue-800">{result.grade}</div>
            <div className="text-sm text-slate-600">スコア: <span className="font-bold">{result.score}</span></div>
          </div>
          <div className="text-sm text-slate-800 leading-relaxed">
            <Badge className="mb-2">AIコメント</Badge>
            <p>{result.comment}</p>
          </div>
        </Card>
      )}
    </div>
  );
}
