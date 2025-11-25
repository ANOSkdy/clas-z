# 認証・ログインロジック調査レポート

## 1. ログイン経路とフロー
- **UI 起点**: `src/components/pages/LoginForm.tsx` から `/api/auth/login` へ `loginId` と `password` を POST し、成功時は `/home` へ遷移。レスポンス Cookie に `session` を設定する実装前提。
- **API 処理**: `/api/auth/login` では Airtable `Users` テーブルを `login_id` で検索し、最初の 1 件のみを対象。`password_hash` フィールドの値と送信パスワードを **平文比較** し、一致した場合に JWT セッションを発行して `session` Cookie をセット。企業 ID は関連 `company` の先頭要素、ロールは `role` の先頭要素（存在しない場合は `member`）を採用。

## 2. セッション生成と検証
- **署名方式**: `jose` の HS256 で署名された JWT。ペイロードは `userId`, `role`, `companyId`, `expiresAt`（1 時間有効）。`SESSION_SECRET` が未設定の場合は `default_secret_key_change_me` が使われる。
- **Cookie 管理**: ログイン成功時に `httpOnly`・`sameSite=lax`・`secure`（本番のみ）・`maxAge=3600` で `session` Cookie をセット。ログアウト `/api/auth/logout` は `session` Cookie を失効日 1970-01-01 に設定して削除。

## 3. 認可・ルーティング制御
- **ミドルウェア**: `src/middleware.ts` で `session` Cookie を検証。未ログインで `/login` 以外の保護ルートにアクセスすると `/` へリダイレクト。ログイン済みで `/` または `/login` にアクセスすると `/home` にリダイレクト。`/_next` や静的ファイルは除外。
- **API 保護**: `getSession` を使う API（例: `/api/customer`, `/api/home/summary`, `/api/rating/upload`, `/api/schedule/list` など）はセッションがない場合 401 を返す。

## 4. リスクと改善ポイント
- **平文パスワード比較**: `password_hash` を平文パスワードと直接比較しており、ハッシュ化されていない可能性。ハッシュ運用であれば検証ロジックの実装が必要。
- **固定フォールバック鍵**: `SESSION_SECRET` 未設定時に固定のデフォルト鍵で署名するため、環境変数未設定だと容易に偽装される。デプロイ環境では必ず強固な秘密鍵を設定し、起動時に未設定なら起動失敗させることを推奨。
- **会社ロールの単一要素選択**: `company` と `role` が配列の場合は先頭要素のみ採用する実装。複数所属・複数ロールをサポートする場合は要件確認が必要。
- **セッション期限**: 有効期限は 1 時間固定。リフレッシュやスライディングセッションが必要なら追加検討。

## 5. 確認結果の要約
- Airtable の `Users` テーブルを `login_id` で検索し、`password_hash` と平文比較後に JWT を発行する、シンプルな Cookie ベース認証。
- ミドルウェアでルートを保護し、API もセッション検証で 401 を返す。ログアウトは Cookie 失効のみ。
