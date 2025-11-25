'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const manuals = [
  {
    id: 'join',
    title: '入社の手続き',
    content: `
# 従業員が入社したとき

従業員を新たに雇い入れた場合は、以下の手続きが必要です。

1. **社会保険**: 5日以内に「資格取得届」を提出してください。
2. **雇用保険**: 翌月10日までに届け出が必要です。
3. **税務**: 「扶養控除等申告書」を回収してください。

## 必要な書類
- 年金手帳
- 雇用保険被保険者証
    `
  },
  {
    id: 'change',
    title: '登記事項の変更',
    content: `
# 会社の情報が変わったとき

以下の変更があった場合は登記が必要です：
- 商号（会社名）
- 本店所在地
- 代表取締役

変更があった日から **2週間以内** に法務局へ申請してください。遅れると過料の対象となります。
    `
  }
];

export default function ManualView() {
  const [selectedId, setSelectedId] = useState(manuals[0].id);
  const [summary, setSummary] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const activeManual = manuals.find(m => m.id === selectedId) || manuals[0];

  const handleAiSummary = async () => {
    setLoadingAi(true);
    setSummary(null);
    try {
      const res = await fetch('/api/ai/manual_summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: activeManual.content }),
      });
      const data = await res.json();
      setSummary(data.summary);
    } catch (e) {
      alert('AI要約に失敗しました');
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 h-full">
      {/* Sidebar (List) */}
      <Card className="w-full md:w-1/4 p-2">
        <h3 className="font-bold text-slate-700 mb-2 px-2 text-sm">目次</h3>
        <ul className="space-y-1">
          {manuals.map((m) => (
            <li key={m.id}>
              <button
                onClick={() => { setSelectedId(m.id); setSummary(null); }}
                className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                  selectedId === m.id ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {m.title}
              </button>
            </li>
          ))}
        </ul>
      </Card>

      {/* Main Content */}
      <Card className="flex-1 min-h-[50vh]">
        <div className="prose prose-sm prose-slate max-w-none mb-8">
          <ReactMarkdown>{activeManual.content}</ReactMarkdown>
        </div>

        <div className="border-t border-slate-100 pt-6 mt-8">
          <Button
            onClick={handleAiSummary}
            isLoading={loadingAi}
            variant="secondary"
            className="gap-2"
          >
            <span>✨</span>
            {loadingAi ? 'Geminiが考え中...' : 'AIで要約する'}
          </Button>

          {summary && (
            <div className="mt-4 p-4 bg-purple-50 text-purple-900 rounded-lg text-sm whitespace-pre-wrap border border-purple-100 shadow-sm">
              <p className="font-bold mb-2 flex items-center gap-2">
                <span>🤖</span> Geminiによる要約
              </p>
              {summary}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
