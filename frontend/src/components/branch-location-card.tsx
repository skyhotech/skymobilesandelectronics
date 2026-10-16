import { BranchStreetView } from "./branch-street-view";
import type { ReactNode } from "react";
import { branchDirections } from "@/lib/branch-directions";
import styles from "./branch-location-card.module.css";

type Branch = { name: string; city: string; address: string; phone: string; google_maps_url: string; street_view_embed_url?: string; code?: string; is_active?: boolean };
export function BranchLocationCard({ branch, actions }: { branch: Branch; actions?: ReactNode }) {
  const directions = branchDirections(branch);
  return <article className={styles.card}>
    <div className={styles.top}><span className={styles.pin}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></svg></span><span className={branch.is_active === false ? styles.inactive : styles.badge}>{branch.is_active === false ? "Inactive" : actions ? "Active branch" : "SKY store"}</span></div>
    <p className={styles.city}>{branch.city || "City not supplied"}</p><h3>{branch.name}</h3>{branch.code && <p className={styles.code}>BRANCH / {branch.code}</p>}
    <p className={styles.address}>{branch.address || "Street address not supplied. Contact the store for its exact location."}</p>
    {branch.phone && <a className={styles.phone} href={`tel:${branch.phone.replace(/[^+0-9]/g, "")}`}>Call {branch.phone}</a>}
    <div className={styles.links}>{directions ? <a className={styles.directions} href={directions} target="_blank" rel="noopener noreferrer">Get directions <span aria-hidden="true">&#8599;</span></a> : <span className={styles.unset}>Add an address or Maps destination for directions</span>}{branch.google_maps_url && <a className={styles.mapLink} href={branch.google_maps_url} target="_blank" rel="noopener noreferrer">View map</a>}</div>
    <BranchStreetView name={branch.name} embedUrl={branch.street_view_embed_url || ""} />
    {actions && <div className={styles.actions}>{actions}</div>}
  </article>;
}
