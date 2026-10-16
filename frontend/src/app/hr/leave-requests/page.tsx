import { HRWorkspace } from "@/components/hr/workspace";

export const metadata = { title: "Leave Requests | SKY HR", robots: { index: false, follow: false } };

export default function LeaveRequestsPage() { return <HRWorkspace view="leave" />; }
