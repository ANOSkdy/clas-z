# ログイン失敗 (NOT_FOUND 404) 調査メモ

## 症状
- ログイン API `/api/auth/login` 呼び出し時に以下のエラーログが出力される。
  - `error: 'NOT_FOUND', message: 'Could not find what you are looking for', statusCode: 404`
- フロントでは 500 エラーとして扱われログインできない。

## 原因
- Airtable から返る `NOT_FOUND` は、指定 Base ID またはテーブル名が存在しないときに発生する。
- 現行コードは `Users` テーブルを `AIRTABLE_BASE_ID` の Base から検索しているため、
  - Base ID が誤っている、
  - または Base に `Users` というテーブルが存在しない
  場合に 404 となる。

## 検証観点
- 環境変数が正しいか: `AIRTABLE_API_KEY` と `AIRTABLE_BASE_ID` が設定されているか。
- Base 内のテーブル名: `Users` という英字テーブル名が存在するか。
- レコード有無: ID `kado0403` / password `kado0403` など検証用レコードが存在するか。

## 暫定対応
- ログイン API で Airtable 404 を捕捉し、Base ID やテーブル名の不整合を明示的に返すよう修正。
- まずは Vercel 環境変数を確認し、`Users` テーブルが Base にあることを確認してください。
