"use client";
import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { hrApi, type Page } from "@/lib/management-api";
import { employmentTypes, type JobOpening } from "@/lib/careers";
import styles from "./workspace.module.css";

const schema = z.object({ title: z.string().trim().min(1).max(150), location: z.string().trim().min(1).max(150), employment_type: z.enum(["full_time", "part_time", "contract", "internship"]), description: z.string().trim().min(1).max(10000), application_email: z.string().trim().email().max(254), is_active: z.boolean() });
type Values = z.infer<typeof schema>;
const defaults: Values = { title: "", location: "", employment_type: "full_time", description: "", application_email: "", is_active: false };
export function HRCareers() {
  const cache = useQueryClient();
  const [editing, setEditing] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState("");
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: defaults });
  const jobs = useQuery({ queryKey: ["hr", "careers", page], queryFn: () => hrApi<Page<JobOpening>>(`careers/?page=${page}`) });
  const refresh = () => { cache.invalidateQueries({ queryKey: ["hr", "careers"] }); };
  const save = useMutation({ mutationFn: (values: Values) => hrApi(editing ? `careers/${editing}/` : "careers/", editing ? "PATCH" : "POST", values), onSuccess: () => { setNotice("Job opening saved."); setEditing(null); form.reset(defaults); refresh(); } });
  const remove = useMutation({ mutationFn: (id: number) => hrApi(`careers/${id}/`, "DELETE"), onSuccess: (_, id) => { if (editing === id) { setEditing(null); form.reset(defaults); } setNotice("Job opening deleted."); setPage(1); refresh(); } });
  return <><p><Link href="/careers" target="_blank" rel="noopener noreferrer">View public careers page</Link></p><div className={styles.details}>
    <section className={styles.card}><h2>{editing ? "Edit job opening" : "Add job opening"}</h2>
      <form className={styles.broadcastForm} onSubmit={form.handleSubmit(values => { setNotice(""); save.mutate(values); })}>
        <label htmlFor="job-title">Job title</label><input id="job-title" maxLength={150} {...form.register("title")} />
        <label htmlFor="job-location">Location</label><input id="job-location" maxLength={150} {...form.register("location")} />
        <label htmlFor="job-type">Employment type</label><select id="job-type" {...form.register("employment_type")}>{Object.entries(employmentTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <label htmlFor="job-description">Description</label><textarea id="job-description" rows={6} maxLength={10000} {...form.register("description")} />
        <label htmlFor="job-email">Application email</label><input id="job-email" type="email" maxLength={254} {...form.register("application_email")} />
        <label><input type="checkbox" {...form.register("is_active")} /> Publish on careers page</label>
        {Object.entries(form.formState.errors).map(([field, error]) => <p role="alert" key={field}>{field.replaceAll("_", " ")}: {error.message}</p>)}
        <button className={styles.signOut} disabled={save.isPending || remove.isPending} type="submit">{save.isPending ? "Saving..." : editing ? "Save changes" : "Create opening"}</button>
        {editing && <button type="button" className={styles.signOut} onClick={() => { setEditing(null); form.reset(defaults); }}>Cancel editing</button>}
      </form>
      {save.error && <p role="alert">{save.error.message}</p>}{notice && <p role="status">{notice}</p>}
    </section>
    <section className={styles.card}><h2>Job openings</h2>{jobs.isPending && <p role="status">Loading openings...</p>}
      {jobs.error && <p role="alert">Unable to load jobs. <button onClick={() => jobs.refetch()}>Retry</button></p>}
      {jobs.data?.count === 0 && <p>No job openings yet.</p>}
      {jobs.data?.results.map(job => <article className={styles.broadcastItem} key={job.id}><h3>{job.title}</h3><p>{job.location} | {employmentTypes[job.employment_type]} | {job.is_active ? "Published" : "Draft"}</p>
        <div className={styles.jobActions}><button className={styles.signOut} disabled={save.isPending || remove.isPending} onClick={() => { setEditing(job.id); form.reset({ title: job.title, location: job.location, employment_type: job.employment_type, description: job.description, application_email: job.application_email, is_active: !!job.is_active }); setNotice(""); }}>Edit {job.title}</button>
        <button className={styles.signOut} disabled={save.isPending || remove.isPending} onClick={() => { if (window.confirm(`Delete ${job.title}? This removes it from the public careers page.`)) remove.mutate(job.id); }}>Delete {job.title}</button></div>
      </article>)}
      {remove.error && <p role="alert">{remove.error.message}</p>}
      {jobs.data && jobs.data.count > 0 && <div className={styles.jobActions}><button className={styles.signOut} disabled={!jobs.data.previous} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page}</span><button className={styles.signOut} disabled={!jobs.data.next} onClick={() => setPage(page + 1)}>Next</button></div>}
    </section>
  </div></>;
}
