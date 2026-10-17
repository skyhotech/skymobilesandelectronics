"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useExperience } from "./provider";
import type { PublicCarousel } from "@/lib/experience";

function metric(slide: number, event: "impressions" | "clicks") {
  void fetch("/experience/api/metrics/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slide, event }),
    keepalive: true,
  }).catch(() => {});
}
function Countdown({ end }: { end: string }) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setLeft(Math.max(0, Date.parse(end) - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [end]);
  return (
    <small>
      {left === null
        ? ""
        : `Ends in ${Math.floor(left / 3600000)}h ${Math.floor(left / 60000) % 60}m ${Math.floor(left / 1000) % 60}s`}
    </small>
  );
}
function CarouselView({ carousel }: { carousel: PublicCarousel }) {
  const [index, setIndex] = useState(0),
    [paused, setPaused] = useState(false),
    [hover, setHover] = useState(false),
    [visible, setVisible] = useState(true);
  const root = useRef<HTMLElement>(null),
    video = useRef<HTMLVideoElement>(null),
    touch = useRef(0),
    seen = useRef(new Set<number>());
  const slide = carousel.slides[index % carousel.slides.length];
  const change = (delta: number) =>
    setIndex((i) => (i + delta + carousel.slides.length) % carousel.slides.length);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let inView = true;
    const update = () => setVisible(inView && !document.hidden);
    const observer = new IntersectionObserver(([e]) => {
      inView = e.isIntersecting;
      update();
    });
    observer.observe(el);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  useEffect(() => {
    const stop =
      paused || hover || !visible || matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (stop) video.current?.pause();
    else void video.current?.play().catch(() => {});
    if (stop) return;
    const id = setTimeout(
      () => setIndex((i) => (i + 1) % carousel.slides.length),
      slide.duration * 1000,
    );
    return () => clearTimeout(id);
  }, [paused, hover, visible, slide.id, slide.duration, carousel.slides.length]);
  useEffect(() => {
    if (visible && !seen.current.has(slide.id)) {
      seen.current.add(slide.id);
      metric(slide.id, "impressions");
    }
  }, [visible, slide.id]);
  return (
    <section
      ref={root}
      className="cms-carousel"
      aria-label={carousel.name}
      aria-roledescription="carousel"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocusCapture={() => setHover(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setHover(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") change(1);
        if (e.key === "ArrowLeft") change(-1);
      }}
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        const delta = e.changedTouches[0].clientX - touch.current;
        if (Math.abs(delta) > 50) change(delta < 0 ? 1 : -1);
      }}
    >
      <div key={slide.id} className={`cms-transition-${carousel.transition}`}>
        <div className="cms-carousel-media">
          {slide.media.type === "video" ? (
            <video
              ref={video}
              src={slide.media.url}
              poster={slide.media.poster}
              muted
              playsInline
              controls
              preload="metadata"
            />
          ) : (
            <img
              src={slide.media.url}
              alt={slide.offer_name}
              width={slide.media.width}
              height={slide.media.height}
            />
          )}
        </div>
        <div className="cms-carousel-copy">
          <small>{slide.season_name}</small>
          <h2>{slide.offer_name}</h2>
          <p>{slide.finance_offer}</p>
          {slide.cta_enabled && (
            <a href={slide.cta_url} onClick={() => metric(slide.id, "clicks")}>
              {slide.cta_label}
            </a>
          )}
          {slide.end_at && <Countdown end={slide.end_at} />}
        </div>
      </div>
      <div className="cms-carousel-controls">
        <button onClick={() => change(-1)} aria-label="Previous promotion">
          ←
        </button>
        {carousel.slides.map((s, i) => (
          <button
            key={s.id}
            aria-label={`Promotion ${i + 1}`}
            aria-current={s.id === slide.id}
            onClick={() => setIndex(i)}
          >
            {i + 1}
          </button>
        ))}
        <button onClick={() => change(1)} aria-label="Next promotion">
          →
        </button>
        <button onClick={() => setPaused(!paused)} aria-pressed={paused}>
          {paused ? "Play" : "Pause"}
        </button>
      </div>
    </section>
  );
}
export function ExperienceCarousels({
  placement,
  fallback = null,
}: {
  placement: string;
  fallback?: ReactNode;
}) {
  const { experience } = useExperience();
  const carousels = experience.carousels.filter((c) => c.placement === placement);
  return carousels.length ? (
    <>
      {carousels.map((c) => (
        <CarouselView key={c.id} carousel={c} />
      ))}
    </>
  ) : (
    fallback
  );
}
