import type { ReactNode } from "react";
const paths: Record<string, ReactNode> = {
chat: <><path d="M21 11.5a9 9 0 0 1-13 8L3 21l1.5-5A9 9 0 1 1 21 11.5Z"/><path d="M8 9h8M8 13h5"/></>,
newChat: <><path d="M20 13v5a2 2 0 0 1-2 2H7l-4 2V6a2 2 0 0 1 2-2h8M19 2v8M15 6h8"/></>,
search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></>,
phone: <path d="m7 3 3 5-2 2a15 15 0 0 0 6 6l2-2 5 3c-1 5-4 5-8 3A25 25 0 0 1 4 11C2 7 2 4 7 3Z"/>,
video: <><rect x="2" y="5" width="14" height="14" rx="3"/><path d="m16 10 6-4v12l-6-4"/></>,
home: <><path d="m3 10 9-7 9 7v11H3Z"/><path d="M9 21v-8h6v8"/></>,
back: <path d="m14 5-7 7 7 7M7 12h14"/>,
more: <><circle cx="12" cy="4" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="20" r="1"/></>,
lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></>,
check: <path d="m4 12 5 5L20 6"/>, doubleCheck: <><path d="m2 12 5 5L18 6M12 17 23 6"/></>,
close: <path d="m6 6 12 12M18 6 6 18"/>, plus: <path d="M12 4v16M4 12h16"/>,
smile: <><circle cx="12" cy="12" r="9"/><path d="M8 14s1 3 4 3 4-3 4-3M8 8v1M16 8v1"/></>,
send: <><path d="m3 3 19 9-19 9 4-9Z"/><path d="M7 12h15"/></>,
};
export function ChatIcon({ name }: { name: keyof typeof paths }) { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>; }
