import { HRWorkspace } from "@/components/hr/workspace";

export const metadata = { title: "Hiring Process | SKY HR", robots: { index: false, follow: false } };

export default function HiringPage() {
  return <HRWorkspace view="hiring" />;
}
