import { ManagementLogin } from "@/components/management/login";

export const metadata = { title: "HR sign in | SKY", robots: { index: false, follow: false } };
export default function HRLoginPage() {
  return <ManagementLogin portal="hr" />;
}
