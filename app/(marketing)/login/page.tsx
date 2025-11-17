import LoginForm from "./_components/LoginForm";

export const metadata = {
  title: "ログイン | CLAS-Z",
};

export default function LoginPage() {
  const devEnabled =
    process.env.NODE_ENV !== "production" && Boolean(process.env.AUTH_DEV_EMAILS?.length);
  return (
    <div className="page-container max-w-xl space-y-8" aria-labelledby="login-heading">
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-text-muted)]">auth</p>
        <h1 id="login-heading" className="text-3xl font-semibold">
          サインイン
        </h1>
        <p className="text-sm text-[color:var(--color-text-muted)]">
          招待トークンを入力してワークスペースに入ります。開発環境では許可済みメールでのログインも利用できます。
        </p>
      </div>
      <LoginForm devEnabled={devEnabled} />
    </div>
  );
}
