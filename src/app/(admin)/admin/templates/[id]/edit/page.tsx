import { notFound } from "next/navigation";

import { TemplateForm } from "@/components/admin/template-form";
import { requireAdminPage } from "@/lib/admin/session";
import { prisma } from "@/lib/db";
import { parseTemplateVariables } from "@/lib/templates/utils";

export const dynamic = "force-dynamic";

interface EditTemplatePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTemplatePage({ params }: EditTemplatePageProps) {
  await requireAdminPage();
  const { id } = await params;

  const template = await prisma.template.findUnique({ where: { id } });

  if (!template) {
    notFound();
  }

  const variables = parseTemplateVariables(template.variables);

  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">Edit: {template.title}</h1>
      <TemplateForm
        mode="edit"
        templateId={template.id}
        initialValues={{
          title: template.title,
          slug: template.slug,
          description: template.description,
          prompt: template.prompt,
          variablesJson: JSON.stringify(variables, null, 2),
          category: template.category,
          requiredPlan: template.requiredPlan,
          isActive: template.isActive,
        }}
      />
    </>
  );
}