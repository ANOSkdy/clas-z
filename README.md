This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### 🔓 Temporary auth bypass (preview/debug)

ログインエラーで画面が確認できない場合は、サーバー環境変数 `AUTH_BYPASS=true` を設定すると以下が有効になります。

- middleware によるリダイレクトをスキップし、`/home` 等を直接閲覧可能
- API はデモ用のモックデータを返却（会社情報・ホームサマリ・スケジュール・決算書アップロード）
- `/api/auth/login` を叩くとデモセッション Cookie がセットされます

任意で `AUTH_BYPASS_COMPANY_ID` を指定するとセッション内の companyId を上書きできます（デモレスポンスは固定値）。

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
