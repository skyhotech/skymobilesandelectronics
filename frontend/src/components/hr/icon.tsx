import type { ReactNode } from "react";

const icons = {
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  employees: <><circle cx="9" cy="7" r="3" /><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6M21 21v-3a6 6 0 0 0-4-5.65" /></>,
  attendance: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  hiring: <><rect x="3" y="7" width="18" height="14" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12a22 22 0 0 0 18 0M12 11v4" /></>,
  notifications: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
  branches: <><path d="M3 21h18M5 21V5l7-2v18M12 9h7v12M8 7v1M8 11v1M8 15v1M16 12v1M16 16v1" /></>,
  leave: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 11h18M9 16l2 2 4-4" /></>,
  careers: <><path d="M8 6V4h8v2" /><rect x="4" y="6" width="16" height="15" rx="2" /><path d="M8 11h8M8 15h5" /></>,
  chevron: <path d="m6 9 6 6 6-6" />,
  website: <><path d="M14 3h7v7M21 3l-9 9M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5" /></>,
  working: <><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>,
  past: <><path d="M3 11a9 9 0 1 1 2 7M3 4v7h7M12 7v5l3 2" /></>,
} satisfies Record<string, ReactNode>;

export function HRIcon({ name, className }: { name: keyof typeof icons; className?: string }) {
  return <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{icons[name]}</svg>;
}
