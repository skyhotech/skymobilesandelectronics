"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { hrApi } from "@/lib/management-api";
import type { JobOpening } from "@/lib/careers";
import { HRIcon } from "./icon";
import styles from "./workspace.module.css";

type Overview = { branches: number; active_branches: number; jobs: number; published_jobs: number; broadcasts: number; cities: { city: string; total: number }[]; recent_jobs: JobOpening[]; recent_broadcasts: { id: number; title: string; message: string; sender_name: string; created_at: string }[] };
const modules = [
  { title: "Messages & Calls", href: "/hr/chat", icon: "notifications", description: "Employee conversations, private files and voice/video calls.", status: "Connected" },
  { title: "Employees", href: "/hr/employees", icon: "employees", description: "All, working, on leave and past employees.", status: "Employee records not connected" },
  { title: "Attendance", href: "/hr/attendance", icon: "attendance", description: "Employee attendance and check-in records.", status: "Attendance not connected" },
  { title: "Hiring Process", href: "/hr/hiring", icon: "hiring", description: "Candidates, interviews and recruitment progress.", status: "Recruitment workflow not connected" },
  { title: "Broadcast Notifications", href: "/hr/notifications", icon: "notifications", description: "Send announcements and enable local browser alerts.", status: "Connected" },
  { title: "Manage Branches", href: "/hr/branches", icon: "branches", description: "Search branches and view city information.", status: "Connected" },
  { title: "Leave Requests", href: "/hr/leave-requests", icon: "leave", description: "Leave applications and approval status.", status: "Leave management not connected" },
  { title: "Careers", href: "/hr/careers", icon: "careers", description: "Create, edit and publish job openings.", status: "Connected" },
] as const;

export function HRDashboard({ username }: { username: string }) {
  const overview = useQuery({ queryKey: ["hr", "overview"], queryFn: () => hrApi<Overview>("overview/"), staleTime: 15000, refetchInterval: 60000, retry: false });
  const data = overview.data;
  return <><section className={styles.welcome}><p className={styles.eyebrow}>Your workspace</p><h2>Welcome to SKY HR</h2><p>Signed in as {username}.</p><span className={styles.badge}>HR access active</span></section>
    <div className={styles.dashboardHeading}><h2>HR overview</h2><button className={styles.signOut} disabled={overview.isFetching} onClick={() => overview.refetch()}>{overview.isFetching ? "Refreshing..." : "Refresh overview"}</button></div>
    {overview.isPending && <p role="status">Loading HR overview...</p>}{overview.error && <p role="alert">Unable to load HR statistics. Use Refresh overview to retry.</p>}
    {data && <section className={styles.statGrid} aria-label="HR statistics">
      {([{ title: "Branches", value: data.branches, detail: `${data.active_branches} active`, href: "/hr/branches" }, { title: "Job openings", value: data.jobs, detail: `${data.jobs - data.published_jobs} drafts`, href: "/hr/careers" }, { title: "Published jobs", value: data.published_jobs, detail: "Visible on careers page", href: "/careers" }, { title: "Broadcasts", value: data.broadcasts, detail: "Sent to HR accounts", href: "/hr/notifications" }]).map(item => <Link className={styles.statCard} href={item.href} key={item.title}><span>{item.title}</span><strong>{item.value}</strong><small>{item.detail}</small></Link>)}
    </section>}
    <h2 className={styles.dashboardHeading}>All HR sections</h2><section className={styles.moduleGrid} aria-label="HR sections">{modules.map(item => <article className={styles.card} key={item.href}><HRIcon name={item.icon} /><h3><Link href={item.href}>{item.title}</Link></h3><p>{item.description}</p><p className={item.status === "Connected" ? styles.connected : styles.pending}>{item.status}</p>{item.icon === "employees" && <div className={styles.jobActions}>{["all", "working", "leave", "past"].map(status => <Link key={status} href={`/hr/employees?status=${status}`}>{status === "all" ? "All" : status === "working" ? "Working" : status === "leave" ? "Leave" : "Past Employees"}</Link>)}</div>}</article>)}</section>
    {data && <><div className={styles.details}>
      <section className={styles.card}><h2>Branches by city</h2>{data.cities.length ? <ul className={styles.cityList}>{data.cities.map(city => <li key={city.city}><span>{city.city || "City not supplied"}</span><strong>{city.total}</strong></li>)}</ul> : <p>No branches recorded.</p>}</section>
      <section className={styles.card}><h2>Recent job openings</h2>{!data.recent_jobs.length && <p>No job openings yet.</p>}{data.recent_jobs.map(job => <article className={styles.broadcastItem} key={job.id}><h3>{job.title}</h3><p>{job.location} | {job.is_active ? "Published" : "Draft"}</p></article>)}<Link href="/hr/careers">Manage job openings</Link><p><Link href="/careers">View public careers page</Link></p></section>
    </div><section className={styles.card} style={{ marginTop: 24 }}><h2>Recent broadcasts</h2>{!data.recent_broadcasts.length && <p>No broadcasts yet.</p>}{data.recent_broadcasts.map(item => <article className={styles.broadcastItem} key={item.id}><h3>{item.title}</h3><p style={{ whiteSpace: "pre-wrap" }}>{item.message}</p><p>Sent by {item.sender_name}</p></article>)}<Link href="/hr/notifications">Manage broadcasts</Link></section></>}
  </>;
}
