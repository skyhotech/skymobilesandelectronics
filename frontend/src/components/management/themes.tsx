import Link from "next/link";
import styles from "./category-manager.module.css";

export function ManagementThemes() {
  return <section className={styles.workspace} aria-label="Homepage themes">
    <header className={styles.pageHeader}>
      <div className={styles.titleRow}><div className={styles.titleBlock}><div>
        <h1>Themes</h1>
        <p>Choose the appearance of your homepage.</p>
      </div></div></div>
    </header>
    <fieldset className={styles.pageHeader}>
      <legend>Homepage theme</legend>
      <label><input type="radio" name="homepage-theme" value="default" defaultChecked /> <strong>Default theme</strong></label>
      <p>Current theme · Active</p>
      <p>Your existing SKY homepage design. Additional themes can be added here when ready.</p>
      <Link href="/" target="_blank" rel="noopener noreferrer">View current homepage ↗</Link>
    </fieldset>
  </section>;
}
