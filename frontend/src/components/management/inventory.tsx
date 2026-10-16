"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { managementApi } from "@/lib/management-api";
import styles from "./inventory.module.css";

const schema = z.object({ columns: z.array(z.string()).max(100), rows: z.array(z.array(z.string()).max(100)).max(10000) });
export function ManagementInventory() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const report = useQuery({
    meta: { globalLoader: "always" },
    queryKey: ["management", "inventory"],
    queryFn: async () => schema.parse(await managementApi("inventory/")),
    staleTime: 0, retry: false, refetchOnWindowFocus: false,
  });
  const needle = search.trim().toLowerCase();
  const rows = (report.data?.rows || []).filter(row => !needle || row.join(" ").toLowerCase().includes(needle));
  const pages = Math.max(1, Math.ceil(rows.length / 100));
  const current = Math.min(page, pages);
  return <section className={styles.workspace} aria-label="Inventory report">
    <header className={styles.header}><div><p className={styles.eyebrow}>APX INVENTORY</p><h1>Inventory</h1><p>Closing stock breakup report from your business system.</p></div>
      <button disabled={report.isFetching} onClick={() => { setPage(1); report.refetch(); }}>{report.isFetching ? "Fetching inventory..." : "Refresh inventory"}</button>
    </header>
    {report.isPending && <div className={styles.message} role="status">Fetching closing stock from APX...</div>}
    {report.error && <div className={styles.error} role="alert"><strong>Unable to load inventory</strong><p>{report.error.message}</p>{report.data && <p>Showing the previous report. Refresh to try again.</p>}</div>}
    {report.data && <>
      <div className={styles.toolbar}><label>Search inventory<input type="search" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Search any report column" /></label><button onClick={() => { setSearch(""); setPage(1); }}>Clear search</button><p>{rows.length} of {report.data.rows.length} report rows</p></div>
      <p className={styles.updated}>Fetched {new Date(report.dataUpdatedAt).toLocaleString()}. Report values and column meanings are supplied by APX.</p>
      {!rows.length ? <div className={styles.message}>{needle ? "No inventory rows match your search." : "APX returned no inventory records for the configured report scope."}</div> : <div className={styles.tableScroll} tabIndex={0} role="region" aria-label="Scrollable inventory table"><table><thead><tr>{report.data.columns.map((column, index) => <th key={index} scope="col">{column}</th>)}</tr></thead><tbody>{rows.slice((current - 1) * 100, current * 100).map((row, index) => <tr key={index}>{report.data!.columns.map((_, column) => <td key={column}>{row[column] || ""}</td>)}</tr>)}</tbody></table></div>}
      <nav className={styles.pagination} aria-label="Inventory report pages"><button disabled={current <= 1} onClick={() => setPage(current - 1)}>Previous</button><span>Page {current} of {pages}</span><button disabled={current >= pages} onClick={() => setPage(current + 1)}>Next</button></nav>
    </>}
  </section>;
}
