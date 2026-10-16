"use client";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { hrApi, type Page } from "@/lib/management-api";
import { HRIcon } from "./icon";
import styles from "./workspace.module.css";
const schema = z.object({ name: z.string().trim().min(1).max(160), code: z.string().trim().min(1).max(40).regex(/^[a-zA-Z0-9_-]+$/, "Use letters, numbers, hyphens or underscores"), city: z.string().trim().max(100), address: z.string().trim().max(5000), phone: z.string().trim().max(24), is_active: z.boolean() });
type Values = z.infer<typeof schema>;
type Branch = Values & { id: number };
const defaults: Values = { name: "", code: "", city: "", address: "", phone: "", is_active: true };

function BranchForm({ branch, onSaved, onCancel }: { branch: Branch | null; onSaved: () => void; onCancel: () => void }) {
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: branch || defaults });
  const section = useRef<HTMLElement>(null);
  useEffect(() => { section.current?.scrollIntoView({ block: "center" }); }, []);
  const save = useMutation({ mutationFn: (values: Values) => hrApi(branch ? `branches/${branch.id}/` : "branches/", branch ? "PATCH" : "POST", values), onSuccess: onSaved });
  return <section ref={section} className={styles.card} style={{ marginBottom: 24 }}><h2>{branch ? "Edit branch" : "Add branch"}</h2><form className={styles.broadcastForm} onSubmit={form.handleSubmit(values => save.mutate(values))}>
    {([ ["name", "Branch name", 160], ["code", "Branch code", 40], ["city", "City", 100], ["phone", "Phone", 24] ] as const).map(([name, label, max]) => <label key={name}>{label}<input {...form.register(name)} maxLength={max} /></label>)}
    <label>Address<textarea {...form.register("address")} rows={3} maxLength={5000} /></label>
    <label><input type="checkbox" {...form.register("is_active")} /> Active branch</label>
    <p>Use a unique code for each branch. Multiple branches can share a city.</p>
    {Object.entries(form.formState.errors).map(([name, error]) => <p role="alert" key={name}>{name}: {error.message}</p>)}
    {save.error && <p role="alert">{save.error.message}</p>}
    <div className={styles.jobActions}><button className={styles.signOut} type="submit" disabled={save.isPending}>{save.isPending ? "Saving..." : "Save branch"}</button><button type="button" className={styles.signOut} disabled={save.isPending} onClick={onCancel}>Cancel</button></div>
  </form></section>;
}

function BranchView({ id, close }: { id: number; close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const detail = useQuery({ queryKey: ["hr", "branches", "detail", id], queryFn: () => hrApi<Branch>(`branches/${id}/`) });
  useEffect(() => { const node = dialog.current; node?.showModal(); return () => node?.close(); }, []);
  return <dialog ref={dialog} className={styles.branchDialog} aria-labelledby="branch-view-title" onCancel={event => { event.preventDefault(); close(); }}>
    <div className={styles.dashboardHeading}><h2 id="branch-view-title">Branch details</h2><button className={styles.signOut} onClick={close}>Close</button></div>
    {detail.isPending && <p role="status">Loading branch...</p>}{detail.error && <p role="alert">Unable to load branch. <button onClick={() => detail.refetch()}>Retry</button></p>}
    {detail.data && <><h3>{detail.data.name}</h3><dl>{([ ["Code", detail.data.code], ["City", detail.data.city], ["Address", detail.data.address], ["Phone", detail.data.phone], ["Status", detail.data.is_active ? "Active" : "Inactive"] ]).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "Not supplied"}</dd></div>)}</dl></>}
  </dialog>;
}

export function HRBranches() {
  const cache = useQueryClient();
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<Branch | null | undefined>(undefined);
  const [view, setView] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const branches = useQuery({ queryKey: ["hr", "branches", term, page], queryFn: () => hrApi<Page<Branch>>(`branches/?search=${encodeURIComponent(term)}&page=${page}`) });
  const refresh = () => { cache.invalidateQueries({ queryKey: ["hr", "branches"] }); cache.invalidateQueries({ queryKey: ["hr", "overview"] }); };
  const remove = useMutation({ mutationFn: (id: number) => hrApi(`branches/${id}/`, "DELETE"), onSuccess: (_, id) => { if (editor?.id === id) setEditor(undefined); setNotice("Branch deleted."); setPage(1); refresh(); } });
  return <>
    <div className={styles.dashboardHeading}><h2>Branch directory</h2><button className={styles.signOut} onClick={() => { setEditor(null); setNotice(""); }}>Add branch</button></div>
    {editor !== undefined && <BranchForm key={editor?.id || "new"} branch={editor} onCancel={() => setEditor(undefined)} onSaved={() => { setEditor(undefined); setNotice("Branch saved."); refresh(); }} />}
    <section className={styles.card}><form className={styles.broadcastForm} onSubmit={event => { event.preventDefault(); setTerm(search.trim()); setPage(1); }}><label htmlFor="branch-search">Search branches or cities</label><input id="branch-search" value={search} onChange={event => setSearch(event.target.value)} maxLength={150} /><button className={styles.signOut}>Search branches</button></form>
      {notice && <p role="status">{notice}</p>}{remove.error && <p role="alert">{remove.error.message}</p>}
      {branches.isPending && <p role="status">Loading branches...</p>}{branches.error && <p role="alert">Unable to load branches. <button onClick={() => branches.refetch()}>Retry</button></p>}
      {branches.data && <><p>{branches.data.count} branches found</p><div className={styles.moduleGrid}>{branches.data.results.map(branch => <article className={styles.branchCard} key={branch.id}><HRIcon name="branches" /><h3>{branch.name}</h3><p>{branch.city || "City not supplied"}</p><p>Code: {branch.code}</p><span className={branch.is_active ? styles.connected : styles.pending}>{branch.is_active ? "Active" : "Inactive"}</span><div className={styles.jobActions}>
        <button className={styles.signOut} onClick={() => setView(branch.id)} aria-label={`View ${branch.name}`}>View</button><button className={styles.signOut} onClick={() => { setEditor(branch); setNotice(""); }} aria-label={`Edit ${branch.name}`}>Edit</button><button className={styles.signOut} disabled={remove.isPending} onClick={() => { if (window.confirm(`Delete ${branch.name}? Branches with inventory cannot be deleted.`)) remove.mutate(branch.id); }} aria-label={`Delete ${branch.name}`}>Delete</button>
      </div></article>)}</div>{branches.data.count === 0 && <p>No branches match your search.</p>}<div className={styles.jobActions} style={{ marginTop: 24 }}><button className={styles.signOut} disabled={!branches.data.previous} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page}</span><button className={styles.signOut} disabled={!branches.data.next} onClick={() => setPage(page + 1)}>Next</button></div></>}
    </section>{view !== null && <BranchView id={view} close={() => setView(null)} />}
  </>;
}
