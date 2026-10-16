"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { hrApi, type Page } from "@/lib/management-api";
import styles from "./workspace.module.css";
type Branch = { id: number; name: string; code: string; city: string; address: string; phone: string; is_active: boolean };
export function HRBranches() {
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(1);
  const branches = useQuery({ queryKey: ["hr", "branches", term, page], queryFn: () => hrApi<Page<Branch>>(`branches/?search=${encodeURIComponent(term)}&page=${page}`) });
  return <section className={styles.card}><h2>Branch directory</h2><form className={styles.broadcastForm} onSubmit={event => { event.preventDefault(); setTerm(search.trim()); setPage(1); }}><label htmlFor="branch-search">Search branches or cities</label><input id="branch-search" value={search} onChange={event => setSearch(event.target.value)} maxLength={150} /><button className={styles.signOut}>Search branches</button></form>
    {branches.isPending && <p role="status">Loading branches...</p>}
    {branches.error && <p role="alert">Unable to load branches. <button onClick={() => branches.refetch()}>Retry</button></p>}
    {branches.data && <><p>{branches.data.count} branches found</p>{branches.data.results.map(branch => <article className={styles.broadcastItem} key={branch.id}><h3>{branch.name}</h3><p>City: {branch.city || "Not supplied"} | Code: {branch.code} | {branch.is_active ? "Active" : "Inactive"}</p>{branch.address && <p>{branch.address}</p>}{branch.phone && <p>{branch.phone}</p>}</article>)}<div className={styles.jobActions}><button className={styles.signOut} disabled={!branches.data.previous} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page}</span><button className={styles.signOut} disabled={!branches.data.next} onClick={() => setPage(page + 1)}>Next</button></div></>}
  </section>;
}
