import { ManagementLogin } from "@/components/management/login";
export const metadata = { title: "Employee sign in | SKY", robots: { index: false, follow: false } };
export default function EmployeeLogin() { return <ManagementLogin portal="employee" />; }
