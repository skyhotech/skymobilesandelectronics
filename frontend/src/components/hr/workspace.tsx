"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { hrApi, type Session } from "@/lib/management-api";
import styles from "@/components/management/management.module.css";

export function HRWorkspace() {
  const router = useRouter();
  const cache = useQueryClient();
  const session = useQuery({ queryKey: ["hr", "session"], queryFn: () => hrApi<Session>("session/"), staleTime: 0, retry: false });
  const logout = useMutation({ mutationFn: () => hrApi("session/", "DELETE"), onSuccess: () => { cache.removeQueries({ queryKey: ["hr"] }); cache.removeQueries({ queryKey: ["management"] }); router.replace("/hr/login"); } });
  return <main className={styles.loginPage}><section className={styles.loginCard}>
    <p className={styles.eyebrow}>SKY HR</p><h1>HR workspace</h1>
    {session.error && <p role="alert">Unable to verify your HR session. <button onClick={() => session.refetch()}>Retry</button></p>}
    {session.data?.user ? <><p>Signed in as {session.data.user.username}.</p><p>Your HR access is active.</p><button className={styles.primary} disabled={logout.isPending} onClick={() => logout.mutate()}>Sign out</button></> : session.data ? <Link href="/hr/login">Sign in to HR</Link> : <p role="status">Checking HR access...</p>}
    {logout.error && <p role="alert">{logout.error.message}</p>}
    <Link className={styles.backLink} href="/">Back to website</Link>
  </section></main>;
}
