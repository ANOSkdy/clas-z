# RC チェックリスト (P9-NFR)

- [ ] Node / pnpm バージョンを満たす（`node -v`, `pnpm -v`）
- [ ] 必須環境変数が設定済み（APP_BASE_URL, AIRTABLE_API_KEY, AIRTABLE_BASE_ID, GEMINI_API_KEY, BLOB_READ_WRITE_TOKEN, ALLOWED_ORIGINS など必要に応じて）
- [ ] `pnpm lint` / `pnpm typecheck` / `pnpm build` が成功
- [ ] アクセシビリティ: フォームの label/aria とエラー要約、モーダルのフォーカストラップ、フォーカスリング、`prefers-reduced-motion` 対応を確認
- [ ] パフォーマンス計測: ページ読み込み後に perf.vitals が `/api/events` へ送信されること
- [ ] セキュリティヘッダー: CSP (Report-Only/strict), CORS  origin 設定、HSTS/COOP/CORP がレスポンスに付与されていること
- [ ] `/api/*` がレート制限 429 を返すことを確認（過剰なリクエスト時）
- [ ] Vercel / Preview 環境変数が Production と整合していること
