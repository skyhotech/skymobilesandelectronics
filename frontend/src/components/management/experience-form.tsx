"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import styles from "./experience-admin.module.css";

export type Field = {
  key: string;
  label: string;
  type?:
    | "number"
    | "boolean"
    | "datetime-local"
    | "date"
    | "time"
    | "textarea"
    | "select"
    | "color"
    | "json";
  choices?: { value: string; label: string }[];
  required?: boolean;
};
export function ExperienceForm({
  title,
  fields,
  initial,
  save,
  close,
}: {
  title: string;
  fields: Field[];
  initial?: Record<string, unknown>;
  save: (data: Record<string, unknown>) => Promise<void>;
  close: () => void;
}) {
  const defaults = Object.fromEntries(
    fields.map((f) => {
      let value = initial?.[f.key];
      if (f.type === "datetime-local" && value)
        value = new Date(String(value)).toLocaleString("sv-SE").replace(" ", "T").slice(0, 16);
      return [
        f.key,
        value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value),
      ];
    }),
  );
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<Record<string, string>>({
    resolver: zodResolver(z.record(z.string())),
    defaultValues: defaults,
  });
  const [error, setError] = useState("");
  return (
    <div className={styles.editor}>
      <h2>{title}</h2>
      <form
        onSubmit={handleSubmit(async (data) => {
          try {
            setError("");
            const parsed: Record<string, unknown> = {};
            for (const f of fields) {
              const value = data[f.key];
              parsed[f.key] =
                f.type === "boolean"
                  ? value === "true"
                  : f.type === "json"
                    ? JSON.parse(value || "[]")
                    : f.type === "number"
                      ? value === ""
                        ? null
                        : Number(value)
                      : f.type === "datetime-local"
                        ? value
                          ? new Date(value).toISOString()
                          : null
                        : f.type === "time"
                          ? value || null
                          : value;
            }
            await save(parsed);
            close();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Save failed");
          }
        })}
      >
        <div className={styles.formGrid}>
          {fields.map((f) => (
            <label key={f.key}>
              {f.label}
              {f.type === "boolean" ? (
                <select {...register(f.key)}>
                  <option value="false">Disabled</option>
                  <option value="true">Enabled</option>
                </select>
              ) : f.type === "select" ? (
                <select {...register(f.key)} required={f.required}>
                  <option value="">Choose…</option>
                  {f.choices?.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              ) : f.type === "textarea" || f.type === "json" ? (
                <textarea {...register(f.key)} required={f.required} rows={4} />
              ) : (
                <input {...register(f.key)} type={f.type || "text"} required={f.required} />
              )}
            </label>
          ))}
        </div>
        {error && <p role="alert">{error}</p>}
        <div className={styles.actions}>
          <button disabled={isSubmitting}>{isSubmitting ? "Saving…" : "Save"}</button>
          <button type="button" onClick={close}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
