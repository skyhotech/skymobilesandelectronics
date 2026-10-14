"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";
import { resolveMediaUrl } from "@/lib/media";

type Props = Omit<ImageProps, "src" | "onError"> & { src?: string | null };

export function MediaImage({ src, ...props }: Props) {
  const source = resolveMediaUrl(src) || "/images/image-placeholder.svg";
  return <ResolvedImage key={source} source={source} {...props} />;
}

function ResolvedImage({ source, ...props }: Omit<Props, "src"> & { source: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <Image
      {...props}
      alt={props.alt}
      src={failed ? "/images/image-placeholder.svg" : source}
      sizes={props.sizes || "(max-width: 640px) 50vw, 25vw"}
      unoptimized
      onError={() => setFailed(true)}
    />
  );
}
