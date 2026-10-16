import { HRWorkspace } from "@/components/hr/workspace";

export const metadata = { title: "Employees | SKY HR", robots: { index: false, follow: false } };

export default async function EmployeesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const employeeStatus = status === "working" || status === "leave" || status === "past" ? status : "all";
  return <HRWorkspace view="employees" employeeStatus={employeeStatus} />;
}
