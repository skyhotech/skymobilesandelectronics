"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { hrApi, type Session } from "@/lib/management-api";
import styles from "./workspace.module.css";

export function HRWorkspace() {
  const router = useRouter();
  const cache = useQueryClient();
  const session = useQuery({ queryKey: ["hr", "session"], queryFn: () => hrApi<Session>("session/"), staleTime: 0, retry: false });
  const logout = useMutation({ mutationFn: () => hrApi("session/", "DELETE"), onSuccess: () => { cache.removeQueries({ queryKey: ["hr"] }); cache.removeQueries({ queryKey: ["management"] }); router.replace("/hr/login"); } });
  return <div className={styles.workspace}>
    <aside className={styles.sidebar}>
      <Link href="/hr" className={styles.brand}>SKY<span>Human Resources</span></Link>
      <p className={styles.navLabel}>Workspace</p>
      <nav aria-label="HR navigation"><Link href="/hr" aria-current="page" className={styles.activeLink}><span aria-hidden="true">▦</span> Dashboard</Link></nav>
      <Link className={styles.websiteLink} href="/">View website ↗</Link>
    </aside>
    <main className={styles.main} id="hr-dashboard">
      <header className={styles.header}><div><p className={styles.eyebrow}>SKY HR</p><h1>Dashboard</h1></div>
        {session.data?.user && <button className={styles.signOut} disabled={logout.isPending} onClick={() => logout.mutate()}>{logout.isPending ? "Signing out…" : "Sign out"}</button>}
      </header>
    {session.error && <p role="alert">Unable to verify your HR session. <button onClick={() => session.refetch()}>Retry</button></p>}
    {session.data?.user ? <><section className={styles.welcome}><p className={styles.eyebrow}>Your workspace</p><h2>Welcome to SKY HR</h2><p>Signed in as {session.data.user.username}.</p><span className={styles.badge}>HR access active</span></section>
      <section className={styles.details} aria-label="Workspace information"><article className={styles.card}><h2>Account</h2><p className={styles.username}>{session.data.user.username}</p><p>Human Resources</p></article><article className={styles.card}><h2>HR workspace</h2><p>Your secure dashboard is ready.</p><p>Employee, attendance and payroll tools are not connected yet.</p></article></section>
    </> : session.data ? <Link href="/hr/login">Sign in to HR</Link> : <p role="status">Checking HR access...</p>}
    {logout.error && <p role="alert">{logout.error.message}</p>}
    </main>
  </div>;
}
