# リリースチェックリスト (P9-NFR)

## 必須確認
- [ ] 環境変数: `APP_BASE_URL`, `AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`, `AIRTABLE_ENDPOINT_URL`, `GEMINI_API_KEY`, `BLOB_READ_WRITE_TOKEN`, 必要に応じて `ALLOWED_ORIGINS`, `ENABLE_STRICT_CSP`
- [ ] `pnpm install` 後に `pnpm run rc` が成功
- [ ] `pnpm lint` / `pnpm typecheck` / `pnpm build` がローカルも CI も通過
- [ ] `vercel.json` のヘッダーと cron 設定を確認（HSTS, COOP/CORP 等）
- [ ] `/api/*` で CORS/CSP/セキュリティヘッダーと 429 応答を確認
- [ ] `/api/events` で `x-correlation-id` が返却され、perf.vitals イベントが保存される
- [ ] UI: フォームのラベル/エラー表示、フォーカス可視化、モーダルのフォーカストラップを確認
- [ ] アニメーションは `prefers-reduced-motion` で抑制されることを確認
- [ ] クライアントで Web Vitals が送信されることを開発者ツールで確認

## 推奨確認
- [ ] Server-Timing ヘッダーにメトリクスが付与されることを API で確認
- [ ] 許可ドメイン以外からの CORS ブロック動作を確認
- [ ] HSTS/COOP/CORP がブラウザのネットワークパネルで有効になっていることを確認
