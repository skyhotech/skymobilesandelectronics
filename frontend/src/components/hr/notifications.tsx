"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { hrApi } from "@/lib/management-api";
import styles from "./workspace.module.css";

const schema = z.object({ title: z.string().trim().min(1, "Enter a title").max(120), message: z.string().trim().min(1, "Enter a message").max(2000) });
type Values = z.infer<typeof schema>;
type Broadcast = Values & { id: number; sender_name: string; created_at: string };

function subscribePermission(callback: () => void) {
  window.addEventListener("focus", callback);
  return () => window.removeEventListener("focus", callback);
}
function browserPermission() { return "Notification" in window ? Notification.permission : "unsupported"; }

export function HRNotifications({ username, compose }: { username: string; compose: boolean }) {
  const cache = useQueryClient();
  const [requestedPermission, setPermission] = useState<string | null>(null);
  const currentPermission = useSyncExternalStore(subscribePermission, browserPermission, () => "default");
  const permission = requestedPermission ?? currentPermission;
  const [notice, setNotice] = useState("");
  const latest = useRef<number | null>(null);
  const form = useForm<Values>({ resolver: zodResolver(schema) });
  const feed = useQuery({ queryKey: ["hr", "notifications"], queryFn: () => hrApi<Broadcast[]>("notifications/"), refetchInterval: 30000, retry: false });
  const send = useMutation({ mutationFn: (values: Values) => hrApi<Broadcast>("notifications/", "POST", values), onSuccess: () => { form.reset(); setNotice("Broadcast sent to the HR notification feed."); cache.invalidateQueries({ queryKey: ["hr", "overview"] }); cache.invalidateQueries({ queryKey: ["hr", "notifications"] }); } });
  useEffect(() => {
    if (!feed.data?.length) { if (feed.data) latest.current ??= 0; return; }
    const newest = feed.data[0].id;
    const key = `sky-hr-notifications:${username}`;
    const previous = latest.current ?? Number(sessionStorage.getItem(key) || newest);
    latest.current = newest;
    sessionStorage.setItem(key, String(newest));
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    for (const item of feed.data.filter(item => item.id > previous).slice(0, 3)) {
      try { new Notification(item.title, { body: item.message, tag: `hr-${item.id}` }); } catch { /* The persistent feed remains available on browsers without desktop alerts. */ }
    }
  }, [feed.data, username]);
  if (!compose) return null;
  return <div className={styles.details}>
    <section className={styles.card}><h2>Send a broadcast</h2><p>Audience: all HR accounts. Alerts update within 30 seconds while this portal is open.</p>
      <form className={styles.broadcastForm} onSubmit={form.handleSubmit(values => { setNotice(""); send.mutate(values); })}>
        <label htmlFor="broadcast-title">Title</label><input id="broadcast-title" maxLength={120} {...form.register("title")} />
        {form.formState.errors.title && <p role="alert">{form.formState.errors.title.message}</p>}
        <label htmlFor="broadcast-message">Message</label><textarea id="broadcast-message" rows={5} maxLength={2000} {...form.register("message")} />
        {form.formState.errors.message && <p role="alert">{form.formState.errors.message.message}</p>}
        <button className={styles.signOut} disabled={send.isPending} type="submit">{send.isPending ? "Sending..." : "Send broadcast"}</button>
      </form>
      {send.error && <p role="alert">{send.error.message}</p>}{notice && <p role="status">{notice}</p>}
      <button className={styles.signOut} disabled={permission === "granted" || permission === "denied" || permission === "unsupported"} onClick={async () => { try { setPermission(await Notification.requestPermission()); } catch { setPermission("unsupported"); } }}>Enable browser notifications</button>
      <p>Browser alerts: {permission}. Browser permission is optional; all broadcasts remain in the feed.</p>
    </section>
    <section className={styles.card}><h2>Recent broadcasts</h2>
      {feed.isPending && <p role="status">Loading broadcasts...</p>}
      {feed.error && <p role="alert">Unable to load broadcasts. <button onClick={() => feed.refetch()}>Retry</button></p>}
      {feed.data?.length === 0 && <p>No broadcasts yet.</p>}
      {feed.data?.map(item => <article key={item.id} className={styles.broadcastItem}><h3>{item.title}</h3><p style={{ whiteSpace: "pre-wrap" }}>{item.message}</p><p>{item.sender_name} | <time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString()}</time></p></article>)}
    </section>
  </div>;
}
