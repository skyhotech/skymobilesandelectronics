"use client";

import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { managementApi } from "@/lib/management-api";
import styles from "./inventory.module.css";

const input = z.object({ mobile: z.string().trim().regex(/^\+?[0-9]{7,15}$/, "Enter a valid mobile number (7-15 digits).") });
const output = z.object({ columns: z.array(z.string()), rows: z.array(z.array(z.string())) });
export function ManagementCustomers() {
  const lookup = useMutation({ gcTime: 0, mutationFn: async (values: z.infer<typeof input>) => output.parse(await managementApi("customers/lookup/", "POST", values)) });
  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof input>>({ resolver: zodResolver(input), defaultValues: { mobile: "" } });
  return <section className={styles.workspace} aria-label="Customer lookup">
    <header className={styles.header}><div><p className={styles.eyebrow}>APX CUSTOMERS</p><h1>Customers</h1><p>Look up customer information by mobile number.</p></div></header>
    <form className={styles.toolbar} onSubmit={handleSubmit(values => lookup.mutate(values))}>
      <label>Customer mobile number<input type="tel" autoComplete="off" maxLength={16} {...register("mobile", { onChange: () => lookup.reset() })} /></label>
      <button type="submit" disabled={lookup.isPending}>Find customer</button>
      <button type="button" disabled={lookup.isPending} onClick={() => { reset(); lookup.reset(); }}>Clear</button>
      {errors.mobile && <p role="alert">{errors.mobile.message}</p>}
    </form>
    {lookup.error && <div className={styles.error} role="alert">{lookup.error.message}</div>}
    {lookup.data && (lookup.data.rows.length ? <>
      <p className={styles.updated}>{lookup.data.rows.length} customer records returned by APX.</p>
      <div className={styles.tableScroll} tabIndex={0} role="region" aria-label="Customer results"><table><thead><tr>{lookup.data.columns.map((column, index) => <th scope="col" key={index}>{column}</th>)}</tr></thead><tbody>{lookup.data.rows.map((row, index) => <tr key={index}>{row.map((cell, column) => <td key={column}>{cell}</td>)}</tr>)}</tbody></table></div>
    </> : <div className={styles.message}>No customers found for this mobile number.</div>)}
  </section>;
}
