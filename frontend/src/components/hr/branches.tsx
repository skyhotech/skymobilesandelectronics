"use client";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { hrApi, type Page } from "@/lib/management-api";
import { BranchLocationCard } from "@/components/branch-location-card";
import { StreetViewManager } from "./streetview-manager";
import { branchDirections } from "@/lib/branch-directions";
import styles from "./workspace.module.css";
const schema = z.object({ name: z.string().trim().min(1).max(160), code: z.string().trim().min(1).max(40).regex(/^[a-zA-Z0-9_-]+$/, "Use letters, numbers, hyphens or underscores"), city: z.string().trim().max(100), address: z.string().trim().max(5000), phone: z.string().trim().max(24), google_maps_url: z.string().trim().max(2000).refine(value => !value || /^https:\/\//.test(value), "Use an HTTPS Google Maps link"), street_view_embed_url: z.string().trim().max(12000), is_showroom: z.boolean(), manual_override: z.boolean(), street_view_enabled: z.boolean(), google_place_id: z.string().trim().max(255), latitude: z.string().refine(v => v === "" || (Number.isFinite(Number(v)) && Math.abs(Number(v)) <= 90), "Latitude must be -90 to 90"), longitude: z.string().refine(v => v === "" || (Number.isFinite(Number(v)) && Math.abs(Number(v)) <= 180), "Longitude must be -180 to 180"), location_verified: z.boolean(), heading: z.coerce.number().min(0).max(360), pitch: z.coerce.number().min(-90).max(90), is_active: z.boolean() });
type Values = z.infer<typeof schema>;
type Branch = Omit<Values, "latitude" | "longitude"> & { id: number; latitude: string | null; longitude: string | null; location_embed_url?: string; street_view_preview_url?: string; street_view_status?: string; street_view_verified?: boolean };
const defaults: Values = { name: "", code: "", city: "", address: "", phone: "", google_maps_url: "", street_view_embed_url: "", is_active: true, is_showroom: true, manual_override: false, street_view_enabled: true, google_place_id: "", latitude: "", longitude: "", location_verified: false, heading: 0, pitch: 0 };

function BranchForm({ branch, onSaved, onCancel }: { branch: Branch | null; onSaved: () => void; onCancel: () => void }) {
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: branch ? { ...branch, latitude: branch.latitude ?? "", longitude: branch.longitude ?? "" } : defaults });
  const section = useRef<HTMLElement>(null);
  useEffect(() => { section.current?.scrollIntoView({ block: "center" }); }, []);
  const save = useMutation({ mutationFn: (values: Values) => hrApi(branch ? `branches/${branch.id}/` : "branches/", branch ? "PATCH" : "POST", { ...values, latitude: values.latitude === "" ? null : Number(values.latitude), longitude: values.longitude === "" ? null : Number(values.longitude) }), onSuccess: onSaved });
  return <section ref={section} className={styles.card} style={{ marginBottom: 24 }}><h2>{branch ? "Edit branch" : "Add branch"}</h2><form className={styles.broadcastForm} onSubmit={form.handleSubmit(values => save.mutate(values))}>
    {([ ["name", "Branch name", 160], ["code", "Branch code", 40], ["city", "City", 100], ["phone", "Phone", 24] ] as const).map(([name, label, max]) => <label key={name}>{label}<input {...form.register(name)} maxLength={max} /></label>)}
    <label>Google Maps link<input {...form.register("google_maps_url")} type="url" maxLength={2000} /></label>
    <label>Street View embed URL or iframe<textarea {...form.register("street_view_embed_url")} rows={3} maxLength={12000} /></label><p>In Google Maps, open the branch Street View, choose Share or embed image, then Embed a map and Copy HTML. No API key is needed.</p>
    <label>Address<textarea {...form.register("address")} rows={3} maxLength={5000} /></label>
    <label><input type="checkbox" {...form.register("is_active")} /> Active branch</label>
    <fieldset className={styles.broadcastForm}><legend>Location and panorama settings</legend>
      <label>Google Place ID<input {...form.register("google_place_id")} maxLength={255} /></label><label>Latitude<input {...form.register("latitude")} inputMode="decimal" /></label><label>Longitude<input {...form.register("longitude")} inputMode="decimal" /></label>
      <label>Camera heading<input {...form.register("heading")} type="number" min={0} max={360} step="any" /></label><label>Camera pitch<input {...form.register("pitch")} type="number" min={-90} max={90} step="any" /></label>
      <label><input type="checkbox" {...form.register("is_showroom")} /> Showroom (visible in store locator)</label><label><input type="checkbox" {...form.register("street_view_enabled")} /> Enable Street View</label><label><input type="checkbox" {...form.register("manual_override")} /> Protect manual location from automatic discovery</label><label><input type="checkbox" {...form.register("location_verified")} /> I verified these exact coordinates</label>
    </fieldset>
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
    {detail.data && <><h3>{detail.data.name}</h3><dl>{([ ["Code", detail.data.code], ["City", detail.data.city], ["Address", detail.data.address], ["Phone", detail.data.phone], ["Status", detail.data.is_active ? "Active" : "Inactive"] ]).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "Not supplied"}</dd></div>)}</dl>{detail.data.location_embed_url && <iframe src={detail.data.location_embed_url} title={`Map of ${detail.data.name}`} style={{ width: "100%", height: 300, border: 0, borderRadius: 12 }} loading="lazy" allowFullScreen referrerPolicy="no-referrer-when-downgrade" />}{detail.data.is_showroom ? <StreetViewManager id={detail.data.id} /> : <p>Non-showroom entry: excluded from the customer locator and automatic Street View discovery.</p>}{branchDirections(detail.data) && <p><a href={branchDirections(detail.data)!} target="_blank" rel="noopener noreferrer">Get directions</a></p>}{detail.data.google_maps_url && <p><a href={detail.data.google_maps_url} target="_blank" rel="noopener noreferrer">Open in Google Maps</a></p>}</>}
  </dialog>;
}

export function HRBranches() {
  const cache = useQueryClient();
  const [search, setSearch] = useState("");
  const [entryType, setEntryType] = useState("true");
  const [status, setStatus] = useState("");
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<Branch | null | undefined>(undefined);
  const [view, setView] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const branches = useQuery({ queryKey: ["hr", "branches", term, page, status, entryType], queryFn: () => hrApi<Page<Branch>>(`branches/?search=${encodeURIComponent(term)}&page=${page}&street_view_status=${encodeURIComponent(status)}&is_showroom=${entryType}`) });
  const refresh = () => {
    cache.invalidateQueries({ queryKey: ["public", "store-locations"] });
    try { localStorage.setItem("sky-branches-updated", String(Date.now())); } catch { /* Cross-tab notifications are optional; periodic refresh remains active. */ } cache.invalidateQueries({ queryKey: ["hr", "branches"] }); cache.invalidateQueries({ queryKey: ["hr", "overview"] }); };
  const remove = useMutation({ mutationFn: (id: number) => hrApi(`branches/${id}/`, "DELETE"), onSuccess: (_, id) => { if (editor?.id === id) setEditor(undefined); setNotice("Branch deleted."); setPage(1); refresh(); } });
  return <>
    <div className={styles.dashboardHeading}><h2>Branch directory</h2><button className={styles.signOut} onClick={() => { setEditor(null); setNotice(""); }}>Add branch</button></div>
    {editor !== undefined && <BranchForm key={editor?.id || "new"} branch={editor} onCancel={() => setEditor(undefined)} onSaved={() => { setEditor(undefined); setNotice("Branch saved."); refresh(); }} />}
    <section className={styles.card}><form className={`${styles.broadcastForm} ${styles.branchSearch}`} onSubmit={event => { event.preventDefault(); setTerm(search.trim()); setPage(1); }}><label htmlFor="branch-search">Search branches or cities<input id="branch-search" value={search} onChange={event => setSearch(event.target.value)} maxLength={150} /></label><label>Branch type<select aria-label="Branch type" value={entryType} onChange={event => { setEntryType(event.target.value); setPage(1); }}><option value="true">Showrooms</option><option value="false">Non-showroom entries</option><option value="">All entries</option></select></label><label>Location status<select aria-label="Location status" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="">All statuses</option>{["pending", "needs_review", "available_nearby", "storefront_verified", "unavailable", "error"].map(value => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label><button className={styles.signOut}>Search branches</button></form>
      {notice && <p role="status">{notice}</p>}{remove.error && <p role="alert">{remove.error.message}</p>}
      {branches.isPending && <p role="status">Loading branches...</p>}{branches.error && <p role="alert">Unable to load branches. <button onClick={() => branches.refetch()}>Retry</button></p>}
      {branches.data && <><p>{branches.data.count} branches found</p><div className={styles.moduleGrid}>{branches.data.results.map(branch => <BranchLocationCard key={branch.id} branch={branch} actions={<>
        <button className={styles.signOut} onClick={() => setView(branch.id)} aria-label={`View ${branch.name}`}>View</button><button className={styles.signOut} onClick={() => { setEditor(branch); setNotice(""); }} aria-label={`Edit ${branch.name}`}>Edit</button><button className={styles.signOut} disabled={remove.isPending} onClick={() => { if (window.confirm(`Delete ${branch.name}? Branches with inventory cannot be deleted.`)) remove.mutate(branch.id); }} aria-label={`Delete ${branch.name}`}>Delete</button>
      </>} />)}</div>{branches.data.count === 0 && <p>No branches match your search.</p>}<div className={styles.jobActions} style={{ marginTop: 24 }}><button className={styles.signOut} disabled={!branches.data.previous} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page}</span><button className={styles.signOut} disabled={!branches.data.next} onClick={() => setPage(page + 1)}>Next</button></div></>}
    </section>{view !== null && <BranchView id={view} close={() => setView(null)} />}
  </>;
}
