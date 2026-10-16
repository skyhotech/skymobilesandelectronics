import { HRWorkspace } from "@/components/hr/workspace";

export const metadata = { title: "Employees | SKY HR", robots: { index: false, follow: false } };

export default function EmployeesPage() {
  return <HRWorkspace view="employees" />;
}
