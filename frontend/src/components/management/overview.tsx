"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { managementApi } from "@/lib/management-api";
import styles from "./category-manager.module.css";

const count = z.number().int().nonnegative();
const group = z.object({ total: count, active: count, homepage: count });
const overviewSchema = z.object({ brands: group, categories: group, products: z.object({ total: count, active: count }) });

export function ManagementOverview() {
  const overview = useQuery({
    queryKey: ["management", "overview"],
    queryFn: async () => overviewSchema.parse(await managementApi("overview/")),
    staleTime: 0, refetchInterval: 30000, refetchIntervalInBackground: false, retry: false,
  });
  return <section className={styles.workspace} aria-label="Management dashboard">
    <header className={styles.pageHeader}>
      <div className={styles.titleRow}><div className={styles.titleBlock}><div><h1>Dashboard</h1><p>Your catalog at a glance, from the current store database.</p></div></div>
        <button className={styles.primaryButton} disabled={overview.isFetching} onClick={() => overview.refetch()}>{overview.isFetching ? "Updating…" : "Refresh dashboard"}</button>
      </div>
    </header>
    {overview.isPending && <p role="status">Loading dashboard…</p>}
    {overview.error && <div role="alert">Unable to load dashboard totals. Please try Refresh dashboard.</div>}
    {overview.data && <>
      <div className={styles.grid}>
        {(["brands", "categories", "products"] as const).map(kind => {
          const data = overview.data[kind];
          return <article className={styles.card} key={kind} aria-label={`${kind} overview`}>
            <div className={styles.cardBody}><h2>{kind[0].toUpperCase() + kind.slice(1)}</h2><dl className={styles.stats}>
              <div><dt>Total {kind}</dt><dd>{data.total}</dd></div>
              <div><dt>Active {kind}</dt><dd>{data.active}</dd></div>
              {"homepage" in data && <div><dt>Published on homepage</dt><dd>{data.homepage}</dd></div>}
            </dl></div>
            <div className={styles.cardActions}><Link className={styles.actionButton} href={`/management/admin/${kind === "products" ? "brands" : kind}`}>{kind === "products" ? "Manage products by brand" : `Manage ${kind}`}</Link></div>
          </article>;
        })}
      </div>
      <p>Totals refresh automatically every 30 seconds while this tab is active. Active product counts reflect the product setting; public visibility also depends on its brand and category.</p>
    </>}
  </section>;
}
