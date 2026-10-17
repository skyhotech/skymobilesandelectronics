"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { experienceSchema, fallback, tokenStyle, type Experience } from "@/lib/experience";
import { managementApi } from "@/lib/management-api";
import "./experience.css";

type Weather = {
  city: string;
  status: string;
  condition: string;
  temperature?: number;
  night?: boolean;
  attribution?: string;
  fetched_at?: string;
};
const Context = createContext({
  experience: fallback,
  status: "connecting",
  weather: null as Weather | null,
});
export const useExperience = () => useContext(Context);

export function ExperienceProvider({
  initial,
  children,
}: {
  initial: Experience;
  children: ReactNode;
}) {
  const [applied, setApplied] = useState(initial);
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [previewOverride, setPreview] = useState<number | null | undefined>();
  const preview =
    previewOverride !== undefined
      ? previewOverride
      : hydrated
        ? Number(new URLSearchParams(location.search).get("theme_preview")) || null
        : null;
  const [status, setStatus] = useState("connecting");
  const [city, setCity] = useState("");
  const [visible, setVisible] = useState(true);
  const generation = useRef(0);
  const query = useQuery({
    queryKey: ["site-experience", preview],
    initialData: preview ? undefined : initial,
    queryFn: async () => {
      if (preview)
        return experienceSchema.parse(await managementApi(`experience/themes/${preview}/preview/`));
      const response = await fetch("/experience/api/", { cache: "no-store" });
      if (!response.ok) throw new Error("Experience unavailable");
      return experienceSchema.parse(await response.json());
    },
    refetchInterval: visible ? 30000 : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
  const weather = useQuery<Weather>({
    queryKey: ["site-weather", city || applied.options.city],
    enabled: applied.options.weather && visible,
    queryFn: async () => {
      const r = await fetch(
        `/experience/api/weather/?city=${encodeURIComponent(city || applied.options.city)}`,
      );
      if (!r.ok) throw new Error("Weather unavailable");
      return r.json();
    },
    staleTime: 900000,
    refetchInterval: visible ? 900000 : false,
    retry: 1,
  });

  useEffect(() => {
    const update = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  useEffect(() => {
    if (!query.data) return;
    const next = query.data;
    const sequence = ++generation.current;
    Promise.all(
      next.assets.map(
        (a) =>
          new Promise<void>((resolve) => {
            const image = new Image();
            image.onload = () => resolve();
            image.onerror = () => resolve();
            image.src = a.thumbnail || a.url;
            window.setTimeout(resolve, 2500);
          }),
      ),
    ).then(() => {
      if (sequence === generation.current)
        setApplied((current) => (next.revision >= current.revision || preview ? next : current));
    });
  }, [query.data, preview]);
  const refetch = useRef(query.refetch);
  useEffect(() => {
    refetch.current = query.refetch;
  }, [query.refetch]);
  useEffect(() => {
    if (preview || !visible) return;
    let socket: WebSocket | undefined;
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;
    let attempt = 0;
    const connect = () => {
      const base = new URL(
        process.env.NEXT_PUBLIC_API_BASE_URL ||
          `${location.protocol}//${location.hostname}:8000/api/v1`,
      );
      base.protocol = base.protocol === "https:" ? "wss:" : "ws:";
      base.pathname = "/ws/experience/";
      base.search = "";
      socket = new WebSocket(base);
      socket.onopen = () => {
        attempt = 0;
        setStatus("connected");
        void refetch.current();
      };
      socket.onmessage = () => void refetch.current();
      socket.onerror = () => socket?.close();
      socket.onclose = () => {
        setStatus("polling fallback");
        if (!stopped)
          timer = setTimeout(connect, Math.min(60000, 1000 * 2 ** attempt++) + Math.random() * 500);
      };
    };
    connect();
    return () => {
      stopped = true;
      clearTimeout(timer);
      socket?.close();
    };
  }, [preview, visible]);
  const config = applied.theme.config,
    options = applied.options;
  const motion = visible && options.animations && options.profile !== "off";
  const effect = options.festival_effects ? config.effect : "none";
  const weatherEffect = options.weather && config.weather ? weather.data?.condition : "none";
  return (
    <Context.Provider value={{ experience: applied, status, weather: weather.data || null }}>
      <div
        className="sky-experience"
        data-theme={applied.theme.slug}
        data-custom={!applied.theme.is_default}
        data-motion={motion}
        data-profile={options.profile}
        data-night={(options.day_night && weather.data?.night) || false}
        data-banner-effects={options.banner_effects}
        style={tokenStyle(applied.theme) as CSSProperties}
      >
        {preview && (
          <div className="experience-preview" role="status">
            Private theme preview{" "}
            <button
              onClick={async () => {
                await managementApi(`experience/themes/${preview}/apply/`, "POST");
                setPreview(null);
                history.replaceState(null, "", location.pathname);
              }}
            >
              Apply theme
            </button>
            <a href={typeof window !== "undefined" ? window.location.pathname : "/"}>
              Exit preview
            </a>
          </div>
        )}
        {options.announcement && (
          <aside className="experience-announcement">{options.announcement}</aside>
        )}
        <div
          aria-hidden="true"
          className={`experience-effects effect-${effect}`}
          style={{ "--effect-speed": `${config.speed}s` } as CSSProperties}
        >
          {Array.from(
            {
              length: Math.min(
                config.intensity,
                options.profile === "battery" ? 4 : options.profile === "high" ? 32 : 16,
              ),
            },
            (_, i) => (
              <i
                key={i}
                style={{
                  left: `${(i * 37) % 100}%`,
                  animationDelay: `-${i * 0.7}s`,
                  top: `${(i * 17) % 100}%`,
                }}
              >
                {effect === "hearts"
                  ? "♡"
                  : effect === "snow"
                    ? "❄"
                    : effect === "flowers"
                      ? "✿"
                      : effect === "kolam"
                        ? "❋"
                        : "✦"}
              </i>
            ),
          )}
        </div>
        <div aria-hidden="true" className={`experience-weather weather-${weatherEffect}`} />
        {children}
        {options.weather && (
          <aside className="weather-location">
            <label>
              Weather location{" "}
              <select
                value={city || options.city}
                onChange={(e) => {
                  setCity(e.target.value);
                  sessionStorage.setItem("sky-weather-city", e.target.value);
                }}
              >
                {["Vellore", "Chennai", "Bengaluru", "Mumbai", "Delhi"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <span>
              {weather.data?.temperature !== undefined
                ? `${weather.data.temperature}°C · ${weather.data.status} forecast`
                : "Weather unavailable"}
            </span>
            <a href="https://api.met.no/doc/License" target="_blank" rel="noreferrer">
              MET Norway · CC BY 4.0
            </a>
          </aside>
        )}
      </div>
    </Context.Provider>
  );
}

export function BannerClock() {
  const { experience, weather } = useExperience();
  const [time, setTime] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => {
      if (!document.hidden) setTime(new Date());
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="sky-banner-clock" aria-label="SKY local date and time">
      <time dateTime={time?.toISOString()}>
        {time
          ? new Intl.DateTimeFormat("en-IN", {
              timeZone: experience.options.timezone,
              dateStyle: "medium",
              timeStyle: "medium",
            }).format(time)
          : "Local time"}
      </time>
      {weather?.temperature !== undefined && (
        <span>
          {weather.city} · {weather.temperature}°C
        </span>
      )}
    </div>
  );
}
