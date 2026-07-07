import { GenerateWorkspaceSkeleton } from "@/components/generate/generate-workspace-skeleton";
import { PageHeader } from "@/components/ui/page-header";

export default function GenerateLoading() {
  return (
    <>
      <PageHeader
        title="Generate"
        description="Fill in parameters, review the prompt, and get content in real time"
      />
      <GenerateWorkspaceSkeleton />
    </>
  );
}