"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { managementApi, hrApi, type Session } from "@/lib/management-api";
import { safeManagementReturn, safeHRReturn } from "@/lib/auth-routes";
import styles from "./management.module.css";

const schema = z.object({
  username: z.string().min(1, "Enter your username"),
  password: z.string().min(1, "Enter your password"),
});

export function ManagementLogin({ portal = "management" }: { portal?: "management" | "hr" }) {
  const isHR = portal === "hr";
  const api = isHR ? hrApi : managementApi;
  const returnPath = isHR ? safeHRReturn : safeManagementReturn;
  const sessionKey = isHR ? "hr" : "management";
  const sceneRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    let frame = 0;
    const reset = () => {
      cancelAnimationFrame(frame);
      for (const name of ["--login-rx", "--login-ry", "--login-form-rx", "--login-form-ry"]) scene.style.setProperty(name, "0deg");
      scene.style.setProperty("--login-x", "0px");
      scene.style.setProperty("--login-y", "0px");
    };
    const configure = () => {
      scene.dataset.loginMotion = !reduced.matches && pointer.matches ? "on" : "off";
      reset();
    };
    const move = (event: PointerEvent) => {
      if (scene.dataset.loginMotion !== "on" || event.pointerType !== "mouse" || scene.querySelector("input:focus, button:focus, a:focus")) return;
      cancelAnimationFrame(frame);
      const x = Math.max(-1, Math.min(1, event.clientX / window.innerWidth * 2 - 1));
      const y = Math.max(-1, Math.min(1, event.clientY / window.innerHeight * 2 - 1));
      frame = requestAnimationFrame(() => {
        scene.style.setProperty("--login-rx", `${-y * 3}deg`);
        scene.style.setProperty("--login-ry", `${x * 4}deg`);
        scene.style.setProperty("--login-form-rx", `${-y * 1.2}deg`);
        scene.style.setProperty("--login-form-ry", `${x * 1.5}deg`);
        scene.style.setProperty("--login-x", `${x * 10}px`);
        scene.style.setProperty("--login-y", `${y * 8}px`);
      });
    };
    configure();
    scene.addEventListener("pointermove", move, { passive: true });
    scene.addEventListener("pointerleave", reset);
    scene.addEventListener("focusin", reset);
    window.addEventListener("blur", reset);
    reduced.addEventListener("change", configure);
    pointer.addEventListener("change", configure);
    return () => {
      cancelAnimationFrame(frame);
      scene.removeEventListener("pointermove", move);
      scene.removeEventListener("pointerleave", reset);
      scene.removeEventListener("focusin", reset);
      window.removeEventListener("blur", reset);
      reduced.removeEventListener("change", configure);
      pointer.removeEventListener("change", configure);
    };
  }, []);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const cache = useQueryClient();
  const session = useQuery({
    queryKey: [sessionKey, "session"],
    queryFn: () => api<Session>("session/"),
    staleTime: 0,
    retry: false,
  });
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });
  const login = useMutation({
    mutationFn: (values: z.infer<typeof schema>) =>
      api<Session>("session/", "POST", values),
    onSuccess: (data) => {
      cache.removeQueries({ queryKey: [isHR ? "management" : "hr"] });
      cache.setQueryData([sessionKey, "session"], data);
      router.replace(returnPath(new URLSearchParams(window.location.search).get("next")));
    },
  });
  useEffect(() => {
    if (session.data?.user)
      router.replace(returnPath(new URLSearchParams(window.location.search).get("next")));
  }, [session.data, router, returnPath]);
  return (
    <main ref={sceneRef} className={styles.authPage}>
      <aside className={styles.authBrand} aria-label={isHR ? "SKY HR access" : "SKY store management"}>
        <Link href="/" className={styles.authBrandLink}>
          <Image
            src="/images/homepage/545193f58191.webp"
            alt="SKY Mobile & Electronics"
            width={80}
            height={80}
            priority
          />
          <span>
            SKY MOBILE<strong>&amp; Electronics</strong>
          </span>
        </Link>
        <div className={styles.authBrandContent}>
          <span className={styles.authPill}>{isHR ? "HR ACCESS" : "STORE MANAGEMENT"}</span>
          <h2>
            {isHR ? "Your people." : "Your catalog."}
            <br />
            {isHR ? "One secure workspace." : "One clear workspace."}
          </h2>
          <p>
            {isHR ? "Sign in with your authorized SKY HR account." : "Keep your products, prices and brands organized, so your team can focus on what comes next."}
          </p>
          <div className={styles.authCapabilities}>
            <span>
              <b>01</b> {isHR ? "Secure sign-in" : "Product catalog"}
            </span>
            <span>
              <b>02</b> {isHR ? "Protected access" : "Brands & categories"}
            </span>
            <span>
              <b>03</b> {isHR ? "SKY workspace" : "Pricing & availability"}
            </span>
          </div>
        </div>
        <p className={styles.authBrandFooter}>
          Since 2001 <span aria-hidden="true">&bull;</span> SKY Mobile &amp; Electronics
        </p>
      </aside>
      <section className={styles.authPanel} aria-labelledby="admin-login-title">
        <div className={styles.authFormCard}>
          <div className={styles.authLock} aria-hidden="true">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <rect x="5" y="10" width="14" height="11" rx="3" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
            </svg>
          </div>
          <p className={styles.eyebrow}>{isHR ? "HR ACCESS" : "OWNER ACCESS"}</p>
          <h1 id="admin-login-title">{isHR ? "HR sign in" : "Welcome back."}</h1>
          <p className={styles.authSubtitle}>{isHR ? "Welcome to SKY HR access." : "Sign in to manage your SKY store."}</p>
          <form
            onSubmit={form.handleSubmit((values) => login.mutate(values))}
            className={styles.form}
          >
            <label htmlFor="admin-username">Username</label>
            <input
              id="admin-username"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="Enter your username"
              aria-invalid={Boolean(form.formState.errors.username)}
              {...form.register("username")}
            />
            {form.formState.errors.username && (
              <p role="alert" className={styles.error}>
                {form.formState.errors.username.message}
              </p>
            )}
            <label htmlFor="admin-password">Password</label>
            <div className={styles.passwordField}>
              <input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                aria-invalid={Boolean(form.formState.errors.password)}
                {...form.register("password")}
              />
              <button
                type="button"
                className={styles.passwordToggle}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                aria-controls="admin-password"
                onClick={() => setShowPassword((visible) => !visible)}
              >
                <svg
                  width="21"
                  height="21"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                  <circle cx="12" cy="12" r="3" />
                  {showPassword && <path d="m3 3 18 18" />}
                </svg>
              </button>
            </div>
            {form.formState.errors.password && (
              <p role="alert" className={styles.error}>
                {form.formState.errors.password.message}
              </p>
            )}
            {(login.error || session.error) && (
              <p role="alert" className={styles.error}>
                {(login.error || session.error)?.message}
              </p>
            )}
            {session.error && (
              <button type="button" className={styles.secondary} onClick={() => session.refetch()}>
                Retry connection
              </button>
            )}
            <button className={styles.primary} disabled={login.isPending || !session.isSuccess}>
              {login.isPending ? "Signing in…" : session.isPending ? "Connecting…" : "Sign in"}
            </button>
          </form>
          <p className={styles.authAccessNote}>{isHR ? "For accounts with approved HR access." : "For authorized store administrators."}</p>
          <Link className={styles.authBackLink} href="/">
            &larr; Back to website
          </Link>
        </div>
        <p className={styles.authPanelFooter}>
          {isHR ? "SKY HR" : "SKY Management"} <span aria-hidden="true">/</span> Your store, connected.
        </p>
      </section>
    </main>
  );
}
