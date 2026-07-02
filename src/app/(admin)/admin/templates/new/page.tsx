import { TemplateForm } from "@/components/admin/template-form";
import { requireAdminPage } from "@/lib/admin/session";

export default async function NewTemplatePage() {
  await requireAdminPage();

  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">New template</h1>
      <TemplateForm mode="create" />
    </>
  );
}