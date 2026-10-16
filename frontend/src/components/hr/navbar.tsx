"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./workspace.module.css";

const sections = [
  { title: "Careers", href: "/hr/careers", keywords: "careers jobs openings vacancies publish" },
  { title: "Leave Requests", href: "/hr/leave-requests", keywords: "leave leaves request requests vacation holiday holidays time off absence approval" },
  { title: "Manage Branches", href: "/hr/branches", keywords: "branch branches store stores location locations office" },
  { title: "Dashboard", href: "/hr", keywords: "overview home summary account" },
  { title: "Employees", href: "/hr/employees", keywords: "employee staff people team directory workers" },
  { title: "Attendance", href: "/hr/attendance", keywords: "attendance present absent check in clock time leave" },
  { title: "Hiring Process", href: "/hr/hiring", keywords: "hiring recruitment recruit candidates applications interview jobs vacancies" },
  { title: "Broadcast Notifications", href: "/hr/notifications", keywords: "broadcast notifications notification alerts announcement messages send" },
];

export function HRNavbarTools() {
  const [query, setQuery] = useState("");
  const [section, setSection] = useState("");
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const terms = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  const results = sections.filter(item => (!section || section === item.href) && terms.every(term => `${item.title} ${item.keywords}`.toLocaleLowerCase().includes(term)));
  const searching = Boolean(query.trim() || section);
  return <div className={styles.navbarTools}>
    <div className={styles.searchArea} role="search" aria-label="HR search">
      <label className={styles.searchLabel} htmlFor="hr-search">Search HR</label>
      <input id="hr-search" type="search" placeholder="Search staff, hiring, alerts..." value={query} maxLength={150} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === "Escape") { setQuery(""); setSection(""); } }} aria-controls="hr-search-results" />
      <select aria-label="Filter HR search" value={section} onChange={event => setSection(event.target.value)}><option value="">All sections</option>{sections.map(item => <option key={item.href} value={item.href}>{item.title}</option>)}</select>
      {searching && <div id="hr-search-results" className={styles.searchResults}>
        <p role="status">{results.length} matching {results.length === 1 ? "section" : "sections"}</p>
        <nav aria-label="HR search results">{results.map(item => <Link key={item.href} href={item.href} onClick={() => { setQuery(""); setSection(""); }}>{item.title}</Link>)}</nav>
        {!results.length && <p>No matching sections. Try staff, interview or alerts.</p>}
        <button type="button" onClick={() => { setQuery(""); setSection(""); }}>Clear search and filters</button>
      </div>}
    </div>
    <div className={styles.liveClock}><span>India time (IST)</span><time aria-label="Current India time" dateTime={now?.toISOString()}>{now ? new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }).format(now) : "Loading time..."}</time></div>
  </div>;
}
