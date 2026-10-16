export type JobOpening = {
  id: number; title: string; location: string;
  employment_type: "full_time" | "part_time" | "contract" | "internship";
  description: string; application_email: string; is_active?: boolean; created_at: string;
};
export const employmentTypes = { full_time: "Full time", part_time: "Part time", contract: "Contract", internship: "Internship" };
