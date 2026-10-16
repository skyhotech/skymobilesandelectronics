import Link from "next/link";
import { employmentTypes, type JobOpening } from "@/lib/careers";
import type { Page } from "@/lib/management-api";
import styles from "./careers.module.css";

export const metadata = { title: "Careers | SKY Mobile & Electronics", description: "Explore job openings at SKY Mobile & Electronics." };
export const dynamic = "force-dynamic";
export default async function CareersPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const params = await searchParams;
  const page = /^\d{1,6}$/.test(params.page || "") && Number(params.page) > 0 ? Number(params.page) : 1;
  let jobs: Page<JobOpening> | null = null;
  try {
    const base = (process.env.API_INTERNAL_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1").replace(/\/$/, "");
    const response = await fetch(`${base}/careers/?page=${page}`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (response.ok) jobs = await response.json();
  } catch { /* Show an honest service error, never an empty openings claim. */ }
  return <main className={styles.page}><nav><Link href="/">SKY Mobile & Electronics</Link></nav><header><p>JOIN OUR TEAM</p><h1>Careers at SKY</h1><p>Find your next opportunity with SKY Mobile & Electronics.</p></header>
    {!jobs ? <section role="alert"><h2>Unable to load job openings</h2><p>Please try again shortly.</p><Link href="/carrears">Try again</Link></section> : <>
      {jobs.count === 0 && <section><h2>No current openings</h2><p>Please check back for future opportunities.</p></section>}
      <div className={styles.grid}>{jobs.results.map(job => <article key={job.id}><p>{job.location} ? {employmentTypes[job.employment_type]}</p><h2>{job.title}</h2><p className={styles.description}>{job.description}</p><a href={`mailto:${encodeURIComponent(job.application_email)}?subject=${encodeURIComponent(`Application: ${job.title}`)}`}>Apply by email ?</a></article>)}</div>
      <nav aria-label="Job pages">{jobs.previous && <Link href={`/carrears?page=${page - 1}`}>Previous</Link>}{jobs.next && <Link href={`/carrears?page=${page + 1}`}>Next</Link>}</nav>
    </>}
  </main>;
}
