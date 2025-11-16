import CustomerEditForm from "./_components/CustomerEditForm";

export const metadata = {
  title: "プロフィール編集 | CLAS-Z",
};

export default function CustomerEditPage() {
  return (
    <section className="page-container space-y-6" aria-labelledby="customer-edit-heading">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-text-muted)]">profile</p>
        <h1 id="customer-edit-heading" className="text-2xl font-semibold">
          プロフィールを編集
        </h1>
        <p className="text-sm text-[color:var(--color-text-muted)]">
          通知用メールや表示名を整えて、安心して連絡を受け取れるようにしましょう。
        </p>
      </header>
      <CustomerEditForm />
    </section>
  );
}
