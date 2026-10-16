"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { chatApi, type ChatCall, type ChatMessage } from "@/lib/chat-api";
import { useInbox } from "./notifications";
import { CallPanel } from "./call-panel";
import styles from "./chat.module.css";

const messageSchema = z.object({ text: z.string().max(4000, "Messages can contain up to 4,000 characters.") });
type MessagePage = { messages: ChatMessage[]; before: number | null };

export function Chat() { return <Suspense fallback={<p>Loading chat...</p>}><ChatContent /></Suspense>; }

function ChatContent() {
  const cache = useQueryClient();
  const inbox = useInbox();
  const searchParams = useSearchParams();
  const [selectedThread, setThread] = useState<number | null>(null);
  const requestedThread = Number(searchParams.get("thread"));
  const thread = selectedThread ?? (Number.isSafeInteger(requestedThread) && requestedThread > 0 ? requestedThread : 0);
  const [search, setSearch] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [filesOnly, setFilesOnly] = useState(false);
  const [older, setOlder] = useState<ChatMessage[]>([]);
  const [error, setError] = useState("");
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [olderCursor, setOlderCursor] = useState<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const clientId = useRef<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const form = useForm<z.infer<typeof messageSchema>>({ resolver: zodResolver(messageSchema), defaultValues: { text: "" } });
  const messages = useQuery({ queryKey: ["chat", "messages", thread, filesOnly], queryFn: () => chatApi<MessagePage>(`threads/${thread}/messages/?files=${filesOnly ? "1" : "0"}`), enabled: thread > 0, refetchInterval: 3000, retry: false, meta: { globalLoader: false } });
  const last = messages.data?.messages.at(-1)?.id;
  useEffect(() => {
    if (!filesOnly && last && document.visibilityState === "visible") {
      chatApi(`threads/${thread}/read/`, "POST", { through: last }).then(() => cache.invalidateQueries({ queryKey: ["chat", "inbox"] })).catch(() => {});
      end.current?.scrollIntoView({ block: "nearest" });
    }
  }, [last, thread, filesOnly, cache]);
  const send = useMutation({
    mutationFn: async (values: z.infer<typeof messageSchema>) => {
      if (!values.text.trim() && !file) throw new Error("Write a message or choose a file.");
      if (!clientId.current) clientId.current = crypto.randomUUID();
      const body = new FormData(); body.set("text", values.text); body.set("client_id", clientId.current);
      if (file) body.set("file", file);
      return chatApi(`threads/${thread}/messages/`, "POST", body);
    },
    onSuccess: () => { clientId.current = null; form.reset(); setFile(null); if (fileInput.current) fileInput.current.value = ""; cache.invalidateQueries({ queryKey: ["chat"] }); },
  });
  const open = async (userId: number) => {
    try { const result = await chatApi<{ id: number }>("inbox/", "POST", { user_id: userId }); setThread(result.id); setFilesOnly(false); setOlder([]); setOlderCursor(null); form.reset(); setFile(null); clientId.current = null; cache.invalidateQueries({ queryKey: ["chat", "inbox"] }); }
    catch (e) { setError((e as Error).message); }
  };
  const requestCall = async (kind: "audio" | "video") => {
    try { await chatApi<ChatCall>(`threads/${thread}/calls/`, "POST", { kind }); cache.invalidateQueries({ queryKey: ["chat", "inbox"] }); }
    catch (e) { setError((e as Error).message); }
  };
  const activeCall = inbox.data?.calls[0];
  const selected = inbox.data?.conversations.find(t => t.id === thread);
  const rows = [...older, ...(messages.data?.messages || [])].filter((m, i, all) => all.findIndex(other => other.id === m.id) === i);
  if (inbox.error) return <p role="alert">{inbox.error.message} <button onClick={() => inbox.refetch()}>Retry chat</button></p>;
  if (!inbox.data) return <p role="status">Loading your conversations...</p>;
  return <section aria-label="Employee and HR chat" className={styles.shell}>
    <aside className={styles.contacts}><h2>SKY messages</h2><label>Find a colleague<input type="search" value={search} onChange={e => setSearch(e.target.value)} /></label>
      {!inbox.data.contacts.length && <p>No chat contacts yet. An administrator must add active employee accounts to the Employees group.</p>}
      {inbox.data.contacts.filter(p => `${p.name} ${p.username}`.toLowerCase().includes(search.toLowerCase())).map(p => {
        const existing = inbox.data.conversations.find(t => t.peer.id === p.id);
        return <button disabled={send.isPending} key={p.id} aria-pressed={existing?.id === thread} onClick={() => open(p.id)}><strong>{p.name}</strong><small>@{p.username}</small>{existing?.unread ? <span>{existing.unread} unread</span> : null}</button>;
      })}
    </aside>
    <div className={styles.conversation}>
      <header className={styles.toolbar}><h2>{selected?.peer.name || "Choose a colleague"}</h2>{thread > 0 && <div><button disabled={!!activeCall} onClick={() => requestCall("audio")}>Voice call</button><button disabled={!!activeCall} onClick={() => requestCall("video")}>Request video call</button></div>}</header>
      {activeCall && <CallPanel key={activeCall.id} call={activeCall} me={inbox.data.me.id} />}
      {thread > 0 ? <>
        <button type="button" onClick={() => { setFilesOnly(!filesOnly); setOlder([]); setOlderCursor(null); }}>{filesOnly ? "Show all messages" : "Shared files"}</button>
        {messages.error && <p role="alert">{messages.error.message}</p>}
        {(olderCursor || (!older.length && messages.data?.before)) && <button disabled={loadingOlder} onClick={async () => {
          setLoadingOlder(true);
          try { const data = await chatApi<MessagePage>(`threads/${thread}/messages/?files=${filesOnly ? "1" : "0"}&before=${olderCursor || messages.data?.before}`); setOlder(previous => [...data.messages, ...previous]); setOlderCursor(data.before); }
          catch (e) { setError((e as Error).message); }
          finally { setLoadingOlder(false); }
        }}>Load older messages</button>}
        <div className={styles.messages} role="log" aria-label="Conversation messages" aria-live="polite">
          {!rows.length && <p>Start a private conversation.</p>}
          {rows.map(message => <article key={message.id} className={message.sender_id === inbox.data.me.id ? styles.sent : styles.received}>
            {message.text && <p>{message.text}</p>}
            {message.attachment_url && <a href={message.attachment_url} download>{message.filename} ({Math.ceil(message.size / 1024)} KB)</a>}
            <small>{new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}{message.sender_id === inbox.data.me.id ? message.read_at ? " - Read" : " - Sent" : ""}</small>
          </article>)}<div ref={end} />
        </div>
        <form className={styles.composer} onSubmit={form.handleSubmit(values => send.mutate(values))}>
          <label>Message<textarea disabled={send.isPending} onChangeCapture={() => { clientId.current = null; }} {...form.register("text")} /></label>
          <label>Attach a file (up to 5 MB)<input disabled={send.isPending} ref={fileInput} type="file" accept=".png,.jpg,.jpeg,.webp,.pdf,.txt" onChange={e => { setFile(e.target.files?.[0] || null); clientId.current = null; }} /></label>
          <button type="submit" disabled={send.isPending}>{send.isPending ? "Sending..." : "Send message"}</button>
          {(send.error || form.formState.errors.text) && <p role="alert">{send.error?.message || form.formState.errors.text?.message}</p>}
        </form>
      </> : <p className={styles.empty}>Secure staff conversations, files and calls in one place.</p>}
      {error && <p role="alert">{error} <button onClick={() => setError("")}>Dismiss</button></p>}
    </div>
  </section>;
}
