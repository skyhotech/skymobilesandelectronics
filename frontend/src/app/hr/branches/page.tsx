import { HRWorkspace } from "@/components/hr/workspace";

export const metadata = { title: "Manage Branches | SKY HR", robots: { index: false, follow: false } };

export default function BranchesPage() { return <HRWorkspace view="branches" />; }
