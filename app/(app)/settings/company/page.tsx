import CompanySettingsProvider from "./_components/CompanySettingsProvider";
import CompanySettingsForm from "./_components/CompanySettingsForm";
import DeleteCompanyDialog from "./_components/DeleteCompanyDialog";

export const metadata = {
  title: "会社設定 | CLAS-Z",
};

export default function CompanySettingsPage() {
  return (
    <section className="page-container space-y-6" aria-labelledby="company-settings-heading">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-text-muted)]">settings</p>
        <h1 id="company-settings-heading" className="text-2xl font-semibold">
          会社設定
        </h1>
        <p className="text-sm text-[color:var(--color-text-muted)]">
          請求・法務情報を管理し、必要に応じて論理削除の操作を行えます。
        </p>
      </header>
      <CompanySettingsProvider>
        <CompanySettingsForm />
        <DeleteCompanyDialog />
      </CompanySettingsProvider>
    </section>
  );
}
