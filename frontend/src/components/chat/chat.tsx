"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { chatApi, type ChatCall, type ChatMessage } from "@/lib/chat-api";
import { ChatNotifications, useInbox } from "./notifications";
import { ChatIcon } from "./icon";
import { CallPanel } from "./call-panel";
import styles from "./chat.module.css";

const messageSchema = z.object({ text: z.string().max(4000, "Messages can contain up to 4,000 characters.") });
type MessagePage = { messages: ChatMessage[]; before: number | null };

export function Chat() { return <Suspense fallback={<p>Loading chat...</p>}><ChatContent /></Suspense>; }

function ChatContent() {
  const cache = useQueryClient();
  const inbox = useInbox();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [selection, setSelection] = useState<{ request: number; id: number } | null>(null);
  const requestedThread = Number(searchParams.get("thread"));
  const requested = Number.isSafeInteger(requestedThread) && requestedThread > 0 ? requestedThread : 0;
  const thread = selection?.request === requested ? selection.id : requested;
  const setThread = (id: number) => setSelection({ request: requested, id });
  const [search, setSearch] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [messageSearch, setMessageSearch] = useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const contactSearch = useRef<HTMLInputElement>(null);
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
      const messageList = end.current?.parentElement;
      messageList?.scrollTo({ top: messageList.scrollHeight, behavior: "instant" });
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
    try { const result = await chatApi<{ id: number }>("inbox/", "POST", { user_id: userId }); setThread(result.id); setMessageSearch(null); setFilesOnly(false); setOlder([]); setOlderCursor(null); form.reset(); setFile(null); if (fileInput.current) fileInput.current.value = ""; clientId.current = null; cache.invalidateQueries({ queryKey: ["chat", "inbox"] }); }
    catch (e) { setError((e as Error).message); }
  };
  const requestCall = async (kind: "audio" | "video") => {
    try { await chatApi<ChatCall>(`threads/${thread}/calls/`, "POST", { kind }); cache.invalidateQueries({ queryKey: ["chat", "inbox"] }); }
    catch (e) { setError((e as Error).message); }
  };
  const activeCall = inbox.data?.calls[0];
  const selected = inbox.data?.conversations.find(t => t.id === thread);
  const rows = [...older, ...(messages.data?.messages || [])].filter((m, i, all) => all.findIndex(other => other.id === m.id) === i).filter(message => !messageSearch || `${message.text} ${message.filename}`.toLowerCase().includes(messageSearch.toLowerCase()));
  if (inbox.error) return <p role="alert">{inbox.error.message} <button onClick={() => inbox.refetch()}>Retry chat</button></p>;
  if (!inbox.data) return <p role="status">Loading your conversations...</p>;
  const contacts = inbox.data.contacts.filter(p => {
    const existing = inbox.data.conversations.find(t => t.peer.id === p.id);
    return (!unreadOnly || !!existing?.unread) && `${p.name} ${p.username}`.toLowerCase().includes(search.toLowerCase());
  }).sort((a, b) => {
    const order = inbox.data.conversations;
    const ai = order.findIndex(t => t.peer.id === a.id);
    const bi = order.findIndex(t => t.peer.id === b.id);
    return (ai < 0 ? Infinity : ai) - (bi < 0 ? Infinity : bi);
  });
  const initials = (name: string) => name.split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
  const toggleFiles = () => { setFilesOnly(!filesOnly); setOlder([]); setOlderCursor(null); };
  return <section id="sky-chat" aria-label="Employee and HR chat" className={styles.shell} data-open={thread > 0}>
    <nav className={styles.rail} aria-label="Chat tools">
      <a href="#sky-conversations" className={styles.railActive} aria-label="Conversations" title="Conversations"><ChatIcon name="chat" /></a>
      <button disabled={!thread} onClick={toggleFiles} aria-label={filesOnly ? "Show all messages" : "Shared files"} title="Shared files"><ChatIcon name="file" /></button>
      <Link href={pathname.startsWith("/hr") ? "/hr" : "/employee/chat"} aria-label="Workspace" title="Workspace"><ChatIcon name="home" /></Link>
      <span className={styles.selfAvatar} title={`Signed in as ${inbox.data.me.name}`}>{initials(inbox.data.me.name)}</span>
    </nav>
    <aside id="sky-conversations" className={styles.contacts} aria-label="Conversations">
      <header className={styles.listHeader}><h2>Chats</h2><button onClick={() => contactSearch.current?.focus()} aria-label="Find a colleague" title="New conversation"><ChatIcon name="newChat" /></button></header>
      <div className={styles.searchBox}><ChatIcon name="search" /><input ref={contactSearch} aria-label="Find a colleague" placeholder="Search or start a new chat" type="search" value={search} onChange={e => setSearch(e.target.value)} /></div>
      <div className={styles.filters} aria-label="Conversation filters"><button aria-pressed={!unreadOnly} onClick={() => setUnreadOnly(false)}>All</button><button aria-pressed={unreadOnly} onClick={() => setUnreadOnly(true)}>Unread</button></div>
      <ChatNotifications inline href={pathname.startsWith("/hr") ? "/hr/chat" : "/employee/chat"} />
      <div className={styles.contactList}>
        {contacts.map(p => {
          const existing = inbox.data.conversations.find(t => t.peer.id === p.id);
          return <button className={styles.contact} disabled={send.isPending} key={p.id} aria-pressed={existing?.id === thread} onClick={() => open(p.id)}>
            <span className={styles.avatar} aria-hidden="true">{initials(p.name)}</span>
            <span className={styles.contactCopy}><strong>{p.name}</strong><small>@{p.username}</small></span>
            {existing?.unread ? <span className={styles.badge} aria-label={`${existing.unread} unread`}>{existing.unread}</span> : null}
          </button>;
        })}
        {!contacts.length && <div className={styles.noContacts}><ChatIcon name="chat" /><h3>{search || unreadOnly ? "No matching chats" : "Your conversations start here"}</h3><p>{search || unreadOnly ? "Try another name or switch to All." : "Approved colleagues will appear here when their accounts are ready."}</p></div>}
      </div>
      <footer className={styles.listFooter}><ChatIcon name="lock" /> Private SKY staff workspace</footer>
    </aside>
    <div className={styles.conversation}>
      {thread > 0 && <header className={styles.toolbar}>
        <button className={styles.back} aria-label="Back to conversations" onClick={() => setThread(0)}><ChatIcon name="back" /></button>
        <span className={styles.avatar} aria-hidden="true">{initials(selected?.peer.name || "SKY")}</span>
        <div className={styles.identity}><h2>{selected?.peer.name || "Conversation"}</h2><small>SKY staff conversation</small></div>
        <div className={styles.headerActions}>
          <button disabled={!!activeCall} aria-label="Voice call" title="Voice call" onClick={() => requestCall("audio")}><ChatIcon name="phone" /></button>
          <button disabled={!!activeCall} aria-label="Request video call" title="Request video call" onClick={() => requestCall("video")}><ChatIcon name="video" /></button>
          <button aria-label="Search conversation" title="Search conversation" onClick={() => setMessageSearch(messageSearch === null ? "" : null)}><ChatIcon name="search" /></button>
          <details className={styles.menu}><summary aria-label="Conversation options" title="Conversation options"><ChatIcon name="more" /></summary><div><button onClick={toggleFiles}>{filesOnly ? "Show all messages" : "Shared files"}</button></div></details>
        </div>
      </header>}
      {activeCall && <CallPanel key={activeCall.id} call={activeCall} me={inbox.data.me.id} />}
      {thread > 0 ? <>
        {messageSearch !== null && <div className={styles.conversationSearch}><input autoFocus aria-label="Search loaded messages" placeholder="Search loaded messages" value={messageSearch} onChange={e => setMessageSearch(e.target.value)} /><button aria-label="Close message search" onClick={() => setMessageSearch(null)}><ChatIcon name="close" /></button></div>}
        {filesOnly && <div className={styles.fileBanner}><ChatIcon name="file" /> Shared files <button onClick={toggleFiles}>Show all messages</button></div>}
        {messages.error && <p role="alert">{messages.error.message}</p>}
        {(olderCursor || (!older.length && messages.data?.before)) && <button disabled={loadingOlder} onClick={async () => {
          setLoadingOlder(true);
          try { const data = await chatApi<MessagePage>(`threads/${thread}/messages/?files=${filesOnly ? "1" : "0"}&before=${olderCursor || messages.data?.before}`); setOlder(previous => [...data.messages, ...previous]); setOlderCursor(data.before); }
          catch (e) { setError((e as Error).message); }
          finally { setLoadingOlder(false); }
        }}>Load older messages</button>}
        <div className={styles.messages} role="log" aria-label="Conversation messages" aria-live="polite">
          <span className={styles.datePill}>{filesOnly ? "Shared files" : "Private staff conversation"}</span>
          {!rows.length && <p className={styles.startMessage}>{messageSearch ? "No loaded messages match your search." : "Say hello to start the conversation."}</p>}
          {rows.map(message => <article key={message.id} className={message.sender_id === inbox.data.me.id ? styles.sent : styles.received}>
            {message.text && <p>{message.text}</p>}
            {message.attachment_url && <a href={message.attachment_url} download>{message.filename} ({Math.ceil(message.size / 1024)} KB)</a>}
            <small>{new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}{message.sender_id === inbox.data.me.id && <span className={message.read_at ? styles.read : styles.delivered} aria-label={message.read_at ? "Read" : "Sent"} title={message.read_at ? "Read" : "Sent"}><ChatIcon name={message.read_at ? "doubleCheck" : "check"} /></span>}</small>
          </article>)}<div ref={end} />
        </div>
        <form className={styles.composer} onSubmit={form.handleSubmit(values => send.mutate(values))}>
          {file && <div className={styles.attachmentPreview}><ChatIcon name="file" /><span>{file.name}</span><button type="button" aria-label="Remove attachment" onClick={() => { setFile(null); clientId.current = null; if (fileInput.current) fileInput.current.value = ""; }}><ChatIcon name="close" /></button></div>}
          {emojiOpen && <div className={styles.emojis} aria-label="Choose an emoji">{["\u{1f600}", "\u{1f44d}", "\u{1f64f}", "\u{1f389}", "\u{2705}", "\u{2764}\u{fe0f}"].map(emoji => <button key={emoji} type="button" aria-label={`Insert ${emoji}`} onClick={() => { form.setValue("text", form.getValues("text") + emoji); clientId.current = null; form.setFocus("text"); }}>{emoji}</button>)}</div>}
          <div className={styles.composerRow}>
            <button type="button" aria-label="Choose emoji" aria-expanded={emojiOpen} disabled={send.isPending} onClick={() => setEmojiOpen(!emojiOpen)}><ChatIcon name="smile" /></button>
            <button className={styles.attach} type="button" title="Attach a file" aria-label="Choose attachment" disabled={send.isPending} onClick={() => fileInput.current?.click()}><ChatIcon name="plus" /></button><label className={styles.srOnly}>Attach a file (up to 5 MB)<input disabled={send.isPending} ref={fileInput} type="file" accept=".png,.jpg,.jpeg,.webp,.pdf,.txt" onChange={e => { setFile(e.target.files?.[0] || null); clientId.current = null; }} /></label>
            <label className={styles.messageInput}><span className={styles.srOnly}>Message</span><textarea rows={1} placeholder="Type a message" disabled={send.isPending} onChangeCapture={() => { clientId.current = null; }} {...form.register("text")} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); if (!send.isPending) form.handleSubmit(values => send.mutate(values))(); } }} /></label>
            <button type="submit" className={styles.sendButton} aria-label={send.isPending ? "Sending..." : "Send message"} disabled={send.isPending}><ChatIcon name="send" /></button>
          </div>
          {(send.error || form.formState.errors.text) && <p role="alert">{send.error?.message || form.formState.errors.text?.message}</p>}
        </form>
      </> : <div className={styles.empty}>
        <div className={styles.emptyArt} aria-hidden="true"><div className={styles.laptop}><span /><ChatIcon name="chat" /></div><span className={styles.artCheck}><ChatIcon name="doubleCheck" /></span></div>
        <h2>SKY Web</h2><p>Messages, files and calls.<br />Stay connected with your team, wherever you work.</p>
        <span className={styles.emptyHint}>Choose a colleague to start a conversation</span>
        <small><ChatIcon name="lock" /> Only approved employees and HR can access this workspace</small>
      </div>}
      {error && <p role="alert">{error} <button onClick={() => setError("")}>Dismiss</button></p>}
    </div>
  </section>;
}
