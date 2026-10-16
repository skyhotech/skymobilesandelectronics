"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { chatApi, type Inbox } from "@/lib/chat-api";
import styles from "./chat.module.css";

export function useInbox() {
  return useQuery({ queryKey: ["chat", "inbox"], queryFn: () => chatApi<Inbox>("inbox/"), refetchInterval: 5000, retry: false, meta: { globalLoader: false } });
}

export function ChatNotifications({ href = "/hr/chat" }: { href?: string }) {
  const inbox = useInbox();
  const cache = useQueryClient();
  const lastCall = useRef(0);
  const previous = useRef<number | null>(null);
  const [permission, setPermission] = useState("");
  const unread = inbox.data?.conversations.reduce((sum, thread) => sum + thread.unread, 0) || 0;
  const incoming = inbox.data?.calls.find(call => call.caller !== inbox.data?.me.id && call.status === "ringing");
  useEffect(() => {
    if (!inbox.data) return;
    if (previous.current !== null && inbox.data.latest_message > previous.current && unread && document.visibilityState !== "visible" && "Notification" in window && Notification.permission === "granted") {
      new Notification("SKY chat", { body: "You have a new private message.", tag: "sky-chat" });
    }
    previous.current = inbox.data.latest_message;
  }, [inbox.data, unread]);
  useEffect(() => {
    if (incoming && incoming.id !== lastCall.current && "Notification" in window && Notification.permission === "granted") {
      lastCall.current = incoming.id;
      new Notification(`Incoming ${incoming.kind} call`, { body: "Open SKY chat to answer.", tag: `sky-call-${incoming.id}` });
    }
  }, [incoming]);
  useEffect(() => {
    let socket: WebSocket | undefined;
    let timer: ReturnType<typeof setTimeout>;
    let heartbeat: ReturnType<typeof setInterval>;
    let stopped = false;
    let delay = 1000;
    const connect = () => {
      const address = process.env.NEXT_PUBLIC_CHAT_WS_URL || `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws/chat/`;
      socket = new WebSocket(address);
      socket.onopen = () => { delay = 1000; heartbeat = setInterval(() => { if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "ping" })); }, 30000); cache.invalidateQueries({ queryKey: ["chat"] }); };
      socket.onmessage = event => { if (JSON.parse(event.data).type === "changed") cache.invalidateQueries({ queryKey: ["chat"] }); };
      socket.onclose = () => { clearInterval(heartbeat); if (!stopped) { timer = setTimeout(connect, delay); delay = Math.min(delay * 2, 30000); } };
      socket.onerror = () => socket?.close();
    };
    connect();
    return () => { stopped = true; clearTimeout(timer); clearInterval(heartbeat); socket?.close(); };
  }, [cache]);
  return <aside className={styles.notice} aria-label="Chat notifications">
    <Link href={href}>Messages{unread ? ` (${unread} unread)` : ""}</Link>
    {incoming && <Link role="alert" href={`${href}?thread=${incoming.conversation}`}>Incoming {incoming.kind} call - open to answer</Link>}
    <button type="button" onClick={async () => {
      if (!("Notification" in window)) { setPermission("Browser notifications are unavailable."); return; }
      setPermission(await Notification.requestPermission());
    }}>Enable chat notifications</button>
    {permission && <small role="status">Notifications: {permission}</small>}
  </aside>;
}
