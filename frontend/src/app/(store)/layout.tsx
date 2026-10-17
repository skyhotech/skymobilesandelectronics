import type { ReactNode } from "react";
import { loadExperience } from "@/lib/experience-server";
import { ExperienceProvider } from "@/components/experience/provider";

export default async function StoreLayout({ children }: { children: ReactNode }) {
  return <ExperienceProvider initial={await loadExperience()}>{children}</ExperienceProvider>;
}
