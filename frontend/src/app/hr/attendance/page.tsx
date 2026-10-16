import { HRWorkspace } from "@/components/hr/workspace";

export const metadata = { title: "Attendance | SKY HR", robots: { index: false, follow: false } };

export default function AttendancePage() {
  return <HRWorkspace view="attendance" />;
}
