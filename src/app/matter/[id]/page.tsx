import BriefView from "@/components/brief/BriefView";
import { MOCK_ENRON_BRIEF } from "@/lib/mock-data";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MatterPage({ params }: PageProps) {
  const { id } = await params;
  // In production: const brief = await ipc.getBrief(id);
  // For scaffolding we render the Enron mock so the UI is visible end-to-end.
  void id;
  return <BriefView brief={MOCK_ENRON_BRIEF} />;
}
