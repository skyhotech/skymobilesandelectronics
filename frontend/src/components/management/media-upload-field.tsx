"use client";

import { useState } from "react";
import { uploadMedia } from "@/lib/media";
import { MediaImage } from "@/components/media/media-image";
import styles from "./management.module.css";

export function MediaUploadField({
  value,
  kind,
  onPendingChange,
  onChange,
}: {
  value: string;
  kind: string;
  onPendingChange: (value: boolean) => void;
  onChange: (value: string) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return (
    <div>
      <div className={styles.categoryImagePreview}>
        <MediaImage
          src={value}
          alt={`${kind === "brands" ? "Brand logo" : "Product image"} preview`}
          width={180}
          height={180}
        />
      </div>
      <label>
        Upload image
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={pending}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            setPending(true);
            onPendingChange(true);
            setError("");
            try {
              onChange(await uploadMedia(file, kind));
            } catch (error) {
              setError(error instanceof Error ? error.message : "Upload failed");
            } finally {
              setPending(false);
              onPendingChange(false);
            }
          }}
        />
      </label>
      {pending && <p role="status">Uploading image…</p>}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {value && (
        <button type="button" className={styles.secondary} onClick={() => onChange("")}>
          Remove image from record
        </button>
      )}
    </div>
  );
}
