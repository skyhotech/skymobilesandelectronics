"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { managementApi } from "@/lib/management-api";
import {
  defaultConfig,
  configSchema,
  type Theme,
  type Asset,
  type Options,
} from "@/lib/experience";
import { ExperienceForm, type Field } from "./experience-form";
import { AssetLibrary } from "./experience-assets";
import styles from "./experience-admin.module.css";

type Row = Record<string, unknown> & { id: number };
const api = <T,>(path: string, method = "GET", body?: unknown) =>
  managementApi<T>(`experience/${path}`, method, body);
const choices = (values: string[]) => values.map((value) => ({ value, label: value }));
function download(name: string, data: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function ManagementThemes() {
  const client = useQueryClient();
  const [tab, setTab] = useState("Themes"),
    [notice, setNotice] = useState(""),
    [search, setSearch] = useState(""),
    [category, setCategory] = useState(""),
    [sort, setSort] = useState("name");
  const [preview, setPreview] = useState<Theme | null>(null),
    [width, setWidth] = useState(1440),
    [route, setRoute] = useState("/");
  const [editor, setEditor] = useState<{ resource: string; row?: Row } | null>(null);
  const themes = useQuery({
    queryKey: ["experience-admin", "themes"],
    queryFn: () => api<Theme[]>("themes/"),
  });
  const assets = useQuery({
    queryKey: ["experience-admin", "assets"],
    queryFn: () => api<Asset[]>("assets/"),
  });
  const settings = useQuery({
    queryKey: ["experience-admin", "settings"],
    queryFn: () =>
      api<{ revision: number; active_theme: number; mode: string; options: Options }>("settings/"),
  });
  const resource =
    tab === "Calendar"
      ? "festivals"
      : tab === "Schedules"
        ? "schedules"
        : tab === "Carousels"
          ? "carousels"
          : tab === "Slides"
            ? "slides"
            : tab === "History"
              ? "history"
              : tab === "Health"
                ? "health"
                : "";
  const rows = useQuery({
    queryKey: ["experience-admin", resource],
    queryFn: () => api<Row[]>(`${resource}/`),
    enabled: !!resource,
  });
  const carousels = useQuery({
    queryKey: ["experience-admin", "carousels"],
    queryFn: () => api<Row[]>("carousels/"),
    enabled: tab === "Slides",
  });
  const refresh = () => client.invalidateQueries({ queryKey: ["experience-admin"] });
  async function act(action: () => Promise<unknown>, message = "Saved") {
    try {
      await action();
      await refresh();
      setNotice(message);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Request failed");
    }
  }
  const themeChoices = themes.data?.map((t) => ({ value: String(t.id), label: t.name })) || [];
  const fields: Record<string, Field[]> = {
    themes: [
      { key: "name", label: "Name", required: true },
      { key: "slug", label: "Slug", required: true },
      { key: "category", label: "Category", required: true },
      { key: "description", label: "Description", type: "textarea" },
      ...Object.keys(defaultConfig.tokens).map((key) => ({
        key,
        label: `${key} color`,
        type: "color" as const,
      })),
      {
        key: "font",
        label: "Typography",
        type: "select",
        choices: choices(["Inter", "Arial", "Georgia"]),
      },
      {
        key: "effect",
        label: "Decoration",
        type: "select",
        choices: choices(configSchema.shape.effect.options),
      },
      { key: "radius", label: "Corner radius (0–32)", type: "number" },
      { key: "intensity", label: "Particle count (0–32)", type: "number" },
      { key: "speed", label: "Motion duration seconds (4–40)", type: "number" },
      { key: "transition_ms", label: "Theme transition milliseconds (0–1000)", type: "number" },
      { key: "weather", label: "Allow weather overlay", type: "boolean" },
      {
        key: "asset_ids",
        label: "Approved asset references (JSON array of library IDs)",
        type: "json",
      },
    ],
    schedules: [
      { key: "name", label: "Name", required: true },
      { key: "theme", label: "Theme", type: "select", choices: themeChoices, required: true },
      { key: "start_at", label: "Starts (local time)", type: "datetime-local", required: true },
      { key: "end_at", label: "Ends (local time)", type: "datetime-local", required: true },
      { key: "priority", label: "Priority", type: "number" },
      { key: "enabled", label: "Enabled", type: "boolean" },
      { key: "weekdays", label: "Weekdays: Monday=0; [] = every day", type: "json" },
      { key: "start_time", label: "Daily start", type: "time" },
      { key: "end_time", label: "Daily end", type: "time" },
    ],
    festivals: [
      { key: "name", label: "Festival", required: true },
      { key: "date", label: "Date", type: "date", required: true },
      { key: "region", label: "Region" },
      { key: "source", label: "Calendar source / correction note" },
      { key: "theme", label: "Theme", type: "select", choices: themeChoices },
      { key: "start_offset", label: "Start offset (days)", type: "number" },
      { key: "end_offset", label: "End offset (days)", type: "number" },
      { key: "priority", label: "Priority", type: "number" },
      { key: "enabled", label: "Automatic activation", type: "boolean" },
    ],
    carousels: [
      { key: "name", label: "Name", required: true },
      { key: "description", label: "Description", type: "textarea" },
      {
        key: "placement",
        label: "Placement",
        type: "select",
        choices: choices(["hero", "offers", "footer"]),
        required: true,
      },
      { key: "theme", label: "Optional theme", type: "select", choices: themeChoices },
      { key: "display_order", label: "Display order", type: "number" },
      {
        key: "transition",
        label: "Transition",
        type: "select",
        choices: choices(["fade", "slide", "zoom"]),
      },
      { key: "published", label: "Published", type: "boolean" },
    ],
    slides: [
      {
        key: "carousel",
        label: "Carousel",
        type: "select",
        choices: carousels.data?.map((c) => ({ value: String(c.id), label: String(c.name) })) || [],
        required: true,
      },
      { key: "season_name", label: "Season name / campaign category", required: true },
      { key: "offer_name", label: "Offer name", required: true },
      { key: "finance_offer", label: "Finance offer / description", type: "textarea" },
      { key: "cta_label", label: "CTA label" },
      { key: "cta_url", label: "CTA destination" },
      { key: "cta_enabled", label: "CTA enabled", type: "boolean" },
      {
        key: "asset",
        label: "16:9 media",
        type: "select",
        choices:
          assets.data
            ?.filter((a) => a.width * 9 === a.height * 16)
            .map((a) => ({ value: String(a.id), label: a.name })) || [],
        required: true,
      },
      { key: "sort_order", label: "Order", type: "number" },
      { key: "duration", label: "Display duration (seconds)", type: "number" },
      { key: "start_at", label: "Publication start", type: "datetime-local" },
      { key: "end_at", label: "Publication end / countdown deadline", type: "datetime-local" },
      { key: "published", label: "Published", type: "boolean" },
    ],
    settings: [
      {
        key: "mode",
        label: "Theme selection",
        type: "select",
        choices: choices(["manual", "automatic"]),
      },
      ...(
        [
          "animations",
          "weather",
          "festival_effects",
          "banner_effects",
          "day_night",
          "apparent_temperature",
        ] as const
      ).map((key) => ({ key, label: key.replaceAll("_", " "), type: "boolean" as const })),
      {
        key: "profile",
        label: "Motion profile",
        type: "select",
        choices: choices(["high", "balanced", "battery", "off"]),
      },
      { key: "timezone", label: "Clock / schedule IANA timezone" },
      {
        key: "city",
        label: "Fallback city",
        type: "select",
        choices: choices(["Vellore", "Chennai", "Bengaluru", "Mumbai", "Delhi"]),
      },
      { key: "hot_threshold", label: "Hot weather threshold °C", type: "number" },
      { key: "announcement", label: "Announcement", type: "textarea" },
      { key: "announcement_start", label: "Announcement start", type: "datetime-local" },
      { key: "announcement_end", label: "Announcement end", type: "datetime-local" },
    ],
  };
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)),
    [yearView, setYearView] = useState(false),
    [drag, setDrag] = useState<number | null>(null);
  function editTheme(theme?: Theme) {
    const config = theme?.config || defaultConfig;
    setEditor({
      resource: "themes",
      row: {
        id: theme?.id || 0,
        name: theme?.name || "",
        slug: theme?.slug || "",
        category: theme?.category || "custom",
        description: theme?.description || "",
        ...config,
        ...config.tokens,
      },
    });
  }
  async function save(data: Record<string, unknown>) {
    if (!editor) return;
    if (editor.resource === "settings") {
      const { mode, ...options } = data;
      await api("settings/", "PATCH", { revision: settings.data!.revision, mode, options });
    } else {
      if (editor.resource === "themes") {
        const tokens = Object.fromEntries(
          Object.keys(defaultConfig.tokens).map((k) => [k, data[k]]),
        );
        const config = configSchema.parse({ ...data, tokens });
        data = {
          name: data.name,
          slug: data.slug,
          category: data.category,
          description: data.description,
          config,
        };
      }
      for (const key of ["theme", "carousel", "asset"])
        if (key in data) data[key] = data[key] ? Number(data[key]) : null;
      await api(
        `${editor.resource}/${editor.row?.id ? `${editor.row.id}/` : ""}`,
        editor.row?.id ? "PATCH" : "POST",
        data,
      );
    }
    await refresh();
    setNotice("Saved");
  }
  if (themes.isLoading || settings.isLoading) return <p>Loading experience settings…</p>;
  if (themes.error || settings.error)
    return (
      <p role="alert">
        {String(themes.error || settings.error)}{" "}
        <button onClick={() => void refresh()}>Retry</button>
      </p>
    );
  return (
    <section className={styles.workspace} aria-label="Storefront experience management">
      <header className={styles.header}>
        <div>
          <small>STOREFRONT EXPERIENCE</small>
          <h1>Themes & campaigns</h1>
          <p>
            Appearance, calendars and promotions. Your original SKY design is always recoverable.
          </p>
        </div>
        <button
          onClick={() =>
            void act(
              () => api(`themes/${themes.data?.find((t) => t.is_default)?.id}/apply/`, "POST"),
              "Default restored",
            )
          }
        >
          Restore Default
        </button>
      </header>
      <nav className={styles.tabs} aria-label="Experience sections">
        {[
          "Themes",
          "Calendar",
          "Schedules",
          "Carousels",
          "Slides",
          "Assets",
          "Animation controls",
          "History",
          "Health",
        ].map((t) => (
          <button
            key={t}
            aria-current={tab === t}
            onClick={() => {
              setTab(t);
              setEditor(
                t === "Animation controls"
                  ? {
                      resource: "settings",
                      row: { id: 0, ...settings.data?.options, mode: settings.data?.mode },
                    }
                  : null,
              );
            }}
          >
            {t}
          </button>
        ))}
      </nav>
      <p role="status" className={styles.notice}>
        {notice}
      </p>
      {tab === "Themes" && (
        <>
          <div className={styles.toolbar}>
            <input
              aria-label="Search themes"
              placeholder="Search themes"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              aria-label="Theme category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All categories</option>
              {[...new Set(themes.data?.map((t) => t.category))].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select aria-label="Sort themes" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="name">Name</option>
              <option value="updated">Recently updated</option>
            </select>
            <button onClick={() => editTheme()}>Create theme</button>
            <label className={styles.upload}>
              Import JSON
              <input
                type="file"
                accept="application/json"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  await act(async () => {
                    if (file.size > 100000) throw new Error("Theme file too large");
                    const data = JSON.parse(await file.text());
                    delete data.id;
                    delete data.is_default;
                    delete data.archived;
                    return api("themes/", "POST", data);
                  }, "Theme imported as a new theme");
                }}
              />
            </label>
          </div>
          <div className={styles.grid}>
            {themes.data
              ?.filter(
                (t) =>
                  (!category || t.category === category) &&
                  `${t.name} ${t.description}`.toLowerCase().includes(search.toLowerCase()),
              )
              .sort((a, b) =>
                sort === "name"
                  ? a.name.localeCompare(b.name)
                  : b.updated_at.localeCompare(a.updated_at),
              )
              .map((t) => {
                const artwork = assets.data?.find(
                  (a) => a.category.toLowerCase() === t.name.toLowerCase(),
                );
                return (
                  <article key={t.id} className={styles.card}>
                    <div
                      className={styles.swatch}
                      style={{
                        background: `linear-gradient(135deg,${t.config.tokens.primary},${t.config.tokens.secondary})`,
                        color: "white",
                      }}
                    >
                      {artwork ? (
                        <img
                          src={artwork.thumbnail}
                          alt={`${t.name} reference artwork`}
                          loading="lazy"
                        />
                      ) : (
                        <>
                          <strong>SKY</strong>
                          <span>{t.name}</span>
                          <div>
                            {Object.values(t.config.tokens)
                              .slice(0, 5)
                              .map((color, i) => (
                                <i key={i} style={{ background: color }} />
                              ))}
                          </div>
                        </>
                      )}
                    </div>
                    <div className={styles.cardBody}>
                      <small>
                        {t.category} ·{" "}
                        {t.config.effect === "none"
                          ? "Baseline animation"
                          : `${t.config.effect} animation`}
                      </small>
                      <h2>{t.name}</h2>
                      {settings.data?.active_theme === t.id && settings.data.mode === "manual" && (
                        <b className={styles.badge}>ACTIVE THEME</b>
                      )}
                      {t.is_default && <b className={styles.badge}>Protected system theme</b>}
                      <p>{t.description}</p>
                      <small>Updated {new Date(t.updated_at).toLocaleDateString()}</small>
                      <div className={styles.actions}>
                        <button
                          onClick={() =>
                            void act(
                              () => api(`themes/${t.id}/apply/`, "POST"),
                              `${t.name} applied`,
                            )
                          }
                        >
                          Apply
                        </button>
                        <button onClick={() => setPreview(t)}>Preview</button>
                        <button disabled={t.is_default} onClick={() => editTheme(t)}>
                          Edit
                        </button>
                        <button
                          disabled={t.is_default}
                          title={t.is_default ? "The original theme is protected" : "Archive theme"}
                          onClick={() => {
                            if (confirm(`Archive ${t.name}? Shared assets will be retained.`))
                              void act(() => api(`themes/${t.id}/`, "DELETE"));
                          }}
                        >
                          Remove
                        </button>
                      </div>
                      <details>
                        <summary>More options</summary>
                        <div className={styles.actions}>
                          <button
                            onClick={() => void act(() => api(`themes/${t.id}/duplicate/`, "POST"))}
                          >
                            Duplicate
                          </button>
                          <button onClick={() => download(`${t.slug}.json`, t)}>Export</button>
                          <button
                            onClick={() => {
                              setTab("Schedules");
                              setEditor({
                                resource: "schedules",
                                row: {
                                  id: 0,
                                  theme: t.id,
                                  priority: 80,
                                  enabled: true,
                                  weekdays: [],
                                },
                              });
                            }}
                          >
                            Schedule
                          </button>
                        </div>
                      </details>
                    </div>
                  </article>
                );
              })}
          </div>
        </>
      )}
      {preview && (
        <div className={styles.previewPanel}>
          <div className={styles.toolbar}>
            <h2>{preview.name} private preview</h2>
            <button onClick={() => setPreview(null)}>Close preview</button>
            {[390, 768, 1440].map((w) => (
              <button key={w} onClick={() => setWidth(w)}>
                {w}px
              </button>
            ))}
            <input
              aria-label="Preview route"
              value={route}
              onChange={(e) => setRoute(e.target.value)}
            />
            <button onClick={() => void act(() => api(`themes/${preview.id}/apply/`, "POST"))}>
              Apply theme
            </button>
          </div>
          <p>Use a storefront route, such as /products or an existing product URL.</p>
          <div className={styles.previewScroll}>
            <iframe
              style={{ width, maxWidth: "none" }}
              src={`${route.startsWith("/") && !route.startsWith("//") && !route.includes("\\") ? route : "/"}${route.includes("?") ? "&" : "?"}theme_preview=${preview.id}`}
              title={`${preview.name} website preview`}
            />
          </div>
        </div>
      )}
      {["Calendar", "Schedules", "Carousels", "Slides"].includes(tab) && (
        <>
          <div className={styles.toolbar}>
            <h2>{tab}</h2>
            <button
              onClick={() =>
                setEditor({
                  resource,
                  row: {
                    id: 0,
                    priority: 80,
                    enabled: true,
                    weekdays: [],
                    start_offset: 0,
                    end_offset: 0,
                    region: "IN-TN",
                    source: "Admin",
                    display_order: 0,
                    sort_order: 0,
                    duration: 7,
                    cta_enabled: true,
                    published: false,
                    placement: "hero",
                    transition: "fade",
                  },
                })
              }
            >
              Create
            </button>
            {tab === "Calendar" && (
              <>
                <input
                  aria-label="Calendar month"
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                />
                <label>
                  <input
                    type="checkbox"
                    checked={yearView}
                    onChange={(e) => setYearView(e.target.checked)}
                  />
                  Year view
                </label>
                <button
                  onClick={() =>
                    void act(
                      () => api("festivals/sync/", "POST", { year: Number(month.slice(0, 4)) }),
                      "Calendar synchronized without overwriting existing dates",
                    )
                  }
                >
                  Import Tamil Nadu calendar
                </button>
              </>
            )}
          </div>
          {rows.error && <p role="alert">{String(rows.error)}</p>}
          {rows.isLoading && <p>Loading…</p>}
          <div className={tab === "Calendar" ? styles.calendar : styles.rows}>
            {Array.isArray(rows.data) &&
              rows.data
                .filter(
                  (r) =>
                    tab !== "Calendar" ||
                    String(r.date).startsWith(yearView ? month.slice(0, 4) : month),
                )
                .map((r) => (
                  <article
                    key={r.id}
                    draggable={tab === "Slides"}
                    onDragStart={() => setDrag(r.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (tab !== "Slides" || drag === null) return;
                      const same = rows.data!.filter((s) => s.carousel === r.carousel);
                      if (!same.find((s) => s.id === drag)) return;
                      const ids = same.filter((s) => s.id !== drag).map((s) => s.id);
                      ids.splice(ids.indexOf(r.id), 0, drag);
                      void act(() => api(`carousels/${r.carousel}/reorder/`, "POST", { ids }));
                    }}
                  >
                    <strong>{String(r.name || r.offer_name)}</strong>
                    <p>
                      {r.date
                        ? String(r.date)
                        : r.start_at
                          ? new Date(String(r.start_at)).toLocaleString()
                          : ""}
                    </p>
                    <small>
                      {r.published !== undefined
                        ? r.published
                          ? "Published"
                          : "Draft"
                        : r.enabled
                          ? "Automatic activation enabled"
                          : "Disabled"}
                      {r.theme
                        ? ` · ${themes.data?.find((t) => t.id === Number(r.theme))?.name || ""}`
                        : ""}
                    </small>
                    <div className={styles.actions}>
                      <button onClick={() => setEditor({ resource, row: r })}>Edit</button>
                      <button
                        onClick={() => {
                          if (confirm("Remove this entry?"))
                            void act(() => api(`${resource}/${r.id}/`, "DELETE"));
                        }}
                      >
                        Remove
                      </button>
                      {tab === "Slides" && (
                        <button
                          onClick={() => {
                            const ids = rows
                              .data!.filter((s) => s.carousel === r.carousel)
                              .map((s) => s.id);
                            const i = ids.indexOf(r.id);
                            if (i > 0) {
                              [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]];
                              void act(() =>
                                api(`carousels/${r.carousel}/reorder/`, "POST", { ids }),
                              );
                            }
                          }}
                        >
                          Move earlier
                        </button>
                      )}
                    </div>
                  </article>
                ))}
          </div>
          {Array.isArray(rows.data) && !rows.data.length && (
            <p>No entries yet. Create one to begin.</p>
          )}
        </>
      )}
      {editor && (
        <ExperienceForm
          key={`${editor.resource}-${editor.row?.id}`}
          title={`Edit ${editor.resource}`}
          fields={fields[editor.resource]}
          initial={editor.row}
          close={() => setEditor(null)}
          save={save}
        />
      )}
      {tab === "Assets" && (
        <AssetLibrary assets={assets.data || []} refresh={refresh} notice={setNotice} />
      )}
      {tab === "History" && Array.isArray(rows.data) && (
        <div className={styles.rows}>
          {rows.data.map((r) => (
            <article key={r.id}>
              <strong>
                Revision {String(r.revision)} · {String(r.action)}
              </strong>
              <p>
                {String(r.actor__username || "System")} ·{" "}
                {new Date(String(r.created_at)).toLocaleString()}
              </p>
              <button
                onClick={() => {
                  if (confirm("Restore this theme configuration in manual mode?"))
                    void act(() => api("history/", "POST", { revision: r.revision }));
                }}
              >
                Restore theme configuration
              </button>
              <button onClick={() => download(`experience-revision-${r.revision}.json`, r)}>
                Export snapshot
              </button>
            </article>
          ))}
        </div>
      )}
      {tab === "Health" && rows.data && (
        <div className={styles.editor}>
          <h2>Experience health</h2>
          <pre>{JSON.stringify(rows.data, null, 2)}</pre>
          <p>
            WebSocket delivery is reconciled by HTTP every 30 seconds while visible. Campaign counts
            are anonymous, approximate and not billing analytics.
          </p>
        </div>
      )}
    </section>
  );
}
