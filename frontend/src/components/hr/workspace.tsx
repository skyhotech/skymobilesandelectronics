"use client";

import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { hrApi, type Session } from "@/lib/management-api";
import { HRIcon } from "./icon";
import { HRNavbarTools } from "./navbar";
import { HRDashboard } from "./dashboard";
import { HRBranches } from "./branches";
import { HRCareers } from "./careers";
import { HRNotifications } from "./notifications";
import styles from "./workspace.module.css";

export function HRWorkspace({ view = "dashboard", employeeStatus = "all" }: { employeeStatus?: "all" | "working" | "leave" | "past"; view?: "dashboard" | "employees" | "attendance" | "hiring" | "notifications" | "branches" | "leave" | "careers" }) {
  const navbar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = navbar.current;
    if (!element) return;
    const update = () => element.parentElement?.style.setProperty("--hr-navbar-height", `${element.getBoundingClientRect().height}px`);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const router = useRouter();
  const cache = useQueryClient();
  const session = useQuery({ queryKey: ["hr", "session"], queryFn: () => hrApi<Session>("session/"), staleTime: 0, retry: false });
  const logout = useMutation({ mutationFn: () => hrApi("session/", "DELETE"), onSuccess: () => { cache.removeQueries({ queryKey: ["hr"] }); cache.removeQueries({ queryKey: ["management"] }); router.replace("/hr/login"); } });
  return <div className={styles.workspace}>
    <aside className={styles.sidebar}>
      <Link href="/hr" className={styles.brand}><Image className={styles.brandLogo} src="/images/homepage/545193f58191.webp" alt="SKY Mobile & Electronics" width={72} height={72} priority /><span>Human Resources</span></Link>
      <p className={styles.navLabel}>Workspace</p>
      <nav aria-label="HR navigation" className={styles.navigation}>
        <Link href="/hr" aria-current={view === "dashboard" ? "page" : undefined} className={view === "dashboard" ? styles.activeLink : styles.navLink}><HRIcon name="dashboard" /> Dashboard</Link>
        <details className={styles.employeeMenu} open={view === "employees"}>
          <summary className={view === "employees" ? styles.activeLink : styles.navLink}><HRIcon name="employees" /> Employees <HRIcon name="chevron" className={styles.chevron} /></summary>
          <div className={styles.employeeSubmenu}>
            {([ ["all", "All"], ["working", "Working"], ["leave", "Leave"], ["past", "Past Employees"] ] as const).map(([status, label]) => <Link key={status} href={`/hr/employees?status=${status}`} aria-current={view === "employees" && employeeStatus === status ? "page" : undefined}><HRIcon name={status === "all" ? "employees" : status === "working" ? "working" : status === "leave" ? "leave" : "past"} />{label}</Link>)}
          </div>
        </details>
        <Link href="/hr/attendance" aria-current={view === "attendance" ? "page" : undefined} className={view === "attendance" ? styles.activeLink : styles.navLink}><HRIcon name="attendance" /> Attendance</Link>
        <Link href="/hr/hiring" aria-current={view === "hiring" ? "page" : undefined} className={view === "hiring" ? styles.activeLink : styles.navLink}><HRIcon name="hiring" /> Hiring Process</Link>
        <Link href="/hr/notifications" aria-current={view === "notifications" ? "page" : undefined} className={view === "notifications" ? styles.activeLink : styles.navLink}><HRIcon name="notifications" /> Broadcast Notifications</Link>
        <Link href="/hr/branches" aria-current={view === "branches" ? "page" : undefined} className={view === "branches" ? styles.activeLink : styles.navLink}><HRIcon name="branches" /> Manage Branches</Link>
        <Link href="/hr/leave-requests" aria-current={view === "leave" ? "page" : undefined} className={view === "leave" ? styles.activeLink : styles.navLink}><HRIcon name="leave" /> Leave Requests</Link>
        <Link href="/hr/careers" aria-current={view === "careers" ? "page" : undefined} className={view === "careers" ? styles.activeLink : styles.navLink}><HRIcon name="careers" /> Careers</Link>
      </nav>
      <Link className={styles.websiteLink} href="/"><HRIcon name="website" /> View website</Link>
    </aside>
    <main className={styles.main} id="hr-dashboard">
      <div ref={navbar} className={styles.navbar}><header className={styles.header}><div><p className={styles.eyebrow}>SKY HR</p><h1>{view === "careers" ? "Careers" : view === "leave" ? "Leave Requests" : view === "branches" ? "Manage Branches" : view === "notifications" ? "Broadcast Notifications" : view === "hiring" ? "Hiring Process" : view === "attendance" ? "Attendance" : view === "employees" ? "Employees" : "Dashboard"}</h1></div>
        {session.data?.user && <button className={styles.signOut} disabled={logout.isPending} onClick={() => logout.mutate()}>{logout.isPending ? "Signing out…" : "Sign out"}</button>}
      </header><HRNavbarTools /></div>
    {session.error && <p role="alert">Unable to verify your HR session. <button onClick={() => session.refetch()}>Retry</button></p>}
    {session.data?.user && <HRNotifications username={session.data.user.username} compose={view === "notifications"} />}
    {session.data?.user ? view === "careers" ? <HRCareers /> : view === "leave" ? <section className={styles.card}><h2>Employee leave requests</h2><p>Leave requests are not connected yet.</p><p>This page will display leave applications and approval status when leave management is configured.</p></section> : view === "branches" ? <HRBranches /> : view === "notifications" ? null : view === "hiring" ? <section className={styles.card}><h2>Recruitment</h2><p>Hiring records are not connected yet.</p><p>This page will display vacancies, applications and interview progress when hiring management is configured.</p></section> : view === "attendance" ? <section className={styles.card}><h2>Employee attendance</h2><p>Attendance records are not connected yet.</p><p>This page will display attendance when attendance management is configured.</p></section> : view === "employees" ? <section className={styles.card}><h2>{({ all: "All employees", working: "Working employees", leave: "Employees on leave", past: "Past employees" })[employeeStatus]}</h2><p>Employee records are not connected yet.</p><p>This page will display your employee directory when employee management is configured.</p></section> : <HRDashboard username={session.data.user.username} />  : session.data ? <Link href="/hr/login">Sign in to HR</Link> : <p role="status">Checking HR access...</p>}
    {logout.error && <p role="alert">{logout.error.message}</p>}
    </main>
  </div>;
}
