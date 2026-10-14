"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { managementApi, type Session } from "@/lib/management-api";
import { safeManagementReturn } from "@/lib/auth-routes";
import styles from "./management.module.css";

const schema = z.object({ username: z.string().min(1, "Enter your username"), password: z.string().min(1, "Enter your password") });

export function ManagementLogin() {
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const cache = useQueryClient();
  const session = useQuery({ queryKey: ["management", "session"], queryFn: () => managementApi<Session>("session/"), staleTime: 0, retry: false });
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });
  const login = useMutation({ mutationFn: (values: z.infer<typeof schema>) => managementApi<Session>("session/", "POST", values), onSuccess: (data) => { cache.setQueryData(["management", "session"], data); router.replace(safeManagementReturn(new URLSearchParams(window.location.search).get("next"))); } });
  useEffect(() => { if (session.data?.user) router.replace(safeManagementReturn(new URLSearchParams(window.location.search).get("next"))); }, [session.data, router]);
  return <main className={styles.authPage}>
    <aside className={styles.authBrand} aria-label="SKY store management">
      <Link href="/" className={styles.authBrandLink}>
        <Image src="/images/homepage/545193f58191.webp" alt="SKY Mobile & Electronics" width={80} height={80} priority />
        <span>SKY MOBILE<strong>&amp; Electronics</strong></span>
      </Link>
      <div className={styles.authBrandContent}>
        <span className={styles.authPill}>STORE MANAGEMENT</span>
        <h2>Your catalog.<br />One clear workspace.</h2>
        <p>Keep your products, prices and brands organized, so your team can focus on what comes next.</p>
        <div className={styles.authCapabilities}>
          <span><b>01</b> Product catalog</span>
          <span><b>02</b> Brands &amp; categories</span>
          <span><b>03</b> Pricing &amp; availability</span>
        </div>
      </div>
      <p className={styles.authBrandFooter}>Since 2001 <span aria-hidden="true">&bull;</span> SKY Mobile &amp; Electronics</p>
    </aside>
    <section className={styles.authPanel} aria-labelledby="admin-login-title">
    <div className={styles.authFormCard}>
    <div className={styles.authLock} aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="5" y="10" width="14" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></svg></div>
    <p className={styles.eyebrow}>OWNER ACCESS</p><h1 id="admin-login-title">Welcome back.</h1><p className={styles.authSubtitle}>Sign in to manage your SKY store.</p>
    <form onSubmit={form.handleSubmit((values) => login.mutate(values))} className={styles.form}>
      <label htmlFor="admin-username">Username</label>
      <input id="admin-username" autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="Enter your username" aria-invalid={Boolean(form.formState.errors.username)} {...form.register("username")} />
      {form.formState.errors.username && <p role="alert" className={styles.error}>{form.formState.errors.username.message}</p>}
      <label htmlFor="admin-password">Password</label>
      <div className={styles.passwordField}>
        <input id="admin-password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Enter your password" aria-invalid={Boolean(form.formState.errors.password)} {...form.register("password")} />
        <button type="button" className={styles.passwordToggle} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} aria-controls="admin-password" onClick={() => setShowPassword((visible) => !visible)}>
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />{showPassword && <path d="m3 3 18 18" />}</svg>
        </button>
      </div>
      {form.formState.errors.password && <p role="alert" className={styles.error}>{form.formState.errors.password.message}</p>}
      {(login.error || session.error) && <p role="alert" className={styles.error}>{(login.error || session.error)?.message}</p>}
      {session.error && <button type="button" className={styles.secondary} onClick={() => session.refetch()}>Retry connection</button>}
      <button className={styles.primary} disabled={login.isPending || !session.isSuccess}>{login.isPending ? "Signing in…" : session.isPending ? "Connecting…" : "Sign in"}</button>
    </form>
    <p className={styles.authAccessNote}>For authorized store administrators.</p>
    <Link className={styles.authBackLink} href="/">&larr; Back to website</Link>
    </div>
    <p className={styles.authPanelFooter}>SKY Management <span aria-hidden="true">/</span> Your store, connected.</p>
  </section></main>;
}
