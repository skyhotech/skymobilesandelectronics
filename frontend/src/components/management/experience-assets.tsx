"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState, useRef } from "react";
import type { Asset } from "@/lib/experience";
import styles from "./experience-admin.module.css";

export function AssetLibrary({
  assets,
  refresh,
  notice,
}: {
  assets: Asset[];
  refresh: () => Promise<unknown>;
  notice: (s: string) => void;
}) {
  const [search, setSearch] = useState(""),
    [unused, setUnused] = useState(false),
    [busy, setBusy] = useState(false),
    [file, setFile] = useState<File | null>(null),
    [purpose, setPurpose] = useState("reference"),
    [crop, setCrop] = useState(false),
    [cropX, setCropX] = useState(50),
    [cropY, setCropY] = useState(50);
  async function upload() {
    if (!file) return;
    setBusy(true);
    try {
      let input = file;
      if (crop && file.type.startsWith("image/")) {
        const bitmap = await createImageBitmap(file);
        const width = Math.min(bitmap.width, (bitmap.height * 16) / 9),
          height = (width * 9) / 16;
        const canvas = document.createElement("canvas");
        canvas.width = 1600;
        canvas.height = 900;
        canvas
          .getContext("2d")!
          .drawImage(
            bitmap,
            ((bitmap.width - width) * cropX) / 100,
            ((bitmap.height - height) * cropY) / 100,
            width,
            height,
            0,
            0,
            1600,
            900,
          );
        bitmap.close();
        const blob = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error("Crop failed"))),
            "image/webp",
            0.92,
          ),
        );
        input = new File([blob], "cropped.webp", { type: "image/webp" });
      }
      if (purpose === "carousel" && input.type.startsWith("image/")) {
        const image = await createImageBitmap(input);
        const valid = image.width * 9 === image.height * 16;
        image.close();
        if (!valid) throw new Error("Select 16:9 cropping before uploading this image.");
      }
      const data = new FormData();
      data.set("file", input);
      data.set("purpose", purpose);
      const csrf =
        document.cookie
          .split("; ")
          .find((c) => c.startsWith("csrftoken="))
          ?.split("=")
          .slice(1)
          .join("=") || "";
      const response = await fetch("/management/api/experience/assets/", {
        method: "POST",
        headers: { "X-CSRFToken": decodeURIComponent(csrf) },
        body: data,
      });
      if (!response.ok) throw new Error(JSON.stringify(await response.json()));
      await refresh();
      notice("Asset uploaded; publish it separately after review.");
      setFile(null);
    } catch (e) {
      notice(String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className={styles.toolbar}>
        <input
          placeholder="Search assets"
          aria-label="Search assets"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label>
          <input type="checkbox" checked={unused} onChange={(e) => setUnused(e.target.checked)} />
          Unused only
        </label>
        <input
          aria-label="Upload media"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/avif,video/mp4,video/webm"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        <select
          aria-label="Asset purpose"
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
        >
          <option value="reference">Theme / reference</option>
          <option value="carousel">16:9 carousel</option>
        </select>
        <label>
          <input type="checkbox" checked={crop} onChange={(e) => setCrop(e.target.checked)} />
          Crop image to 16:9
        </label>
        <button disabled={!file || busy} onClick={() => void upload()}>
          {busy ? "Processing…" : "Upload"}
        </button>
      </div>
      {crop && file && <CropPreview file={file} x={cropX} y={cropY} />}{" "}
      {crop && (
        <div className={styles.toolbar}>
          <label>
            Horizontal crop
            <input type="range" value={cropX} onChange={(e) => setCropX(Number(e.target.value))} />
          </label>
          <label>
            Vertical crop
            <input type="range" value={cropY} onChange={(e) => setCropY(Number(e.target.value))} />
          </label>
        </div>
      )}
      <p>
        Reference files are never published automatically. Shared files are retained. Videos require
        server-side FFmpeg validation and poster generation.
      </p>
      <div className={styles.grid}>
        {assets
          .filter(
            (a) =>
              a.name.toLowerCase().includes(search.toLowerCase()) &&
              (!unused || (!a.themes?.length && !a.slides?.length)),
          )
          .map((a) => (
            <article className={styles.card} key={a.id}>
              <img
                className={styles.assetImage}
                src={a.thumbnail || a.poster}
                alt={a.name}
                loading="lazy"
              />
              <div className={styles.cardBody}>
                <h3>{a.name}</h3>
                <p>
                  {a.category} · {a.width} × {a.height} · {(a.bytes / 1024 / 1024).toFixed(1)} MB
                </p>
                <small>
                  {a.themes?.length || 0} themes / {a.slides?.length || 0} slides
                </small>
                <a href={a.url} target="_blank" rel="noreferrer">
                  Preview asset
                </a>
              </div>
            </article>
          ))}
      </div>
    </>
  );
}
function CropPreview({ file, x, y }: { file: File; x: number; y: number }) {
  const image = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const url = URL.createObjectURL(file);
    if (image.current) image.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return (
    <div className={styles.crop}>
      <img ref={image} alt="16:9 crop preview" style={{ objectPosition: `${x}% ${y}%` }} />
    </div>
  );
}
