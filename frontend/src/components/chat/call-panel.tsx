"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { chatApi, type ChatCall } from "@/lib/chat-api";
import styles from "./chat.module.css";

type Signal = { id: number; kind: "offer" | "answer" | "ice"; payload: RTCSessionDescriptionInit & RTCIceCandidateInit };
type CallState = ChatCall & { signals: Signal[]; ice_servers: RTCIceServer[] };

export function CallPanel({ call, me }: { call: ChatCall; me: number }) {
  const cache = useQueryClient();
  const [error, setError] = useState("");
  const [connection, setConnection] = useState("Waiting for answer");
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const localVideo = useRef<HTMLVideoElement>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const peer = useRef<RTCPeerConnection | null>(null);
  const local = useRef<MediaStream | null>(null);
  const cleanup = () => {
    local.current?.getTracks().forEach(track => track.stop()); local.current = null;
    peer.current?.close(); peer.current = null;
    if (localVideo.current) localVideo.current.srcObject = null;
    if (remoteVideo.current) remoteVideo.current.srcObject = null;
  };
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let cursor = 0;
    const candidates: RTCIceCandidateInit[] = [];
    const send = (kind: string, payload: unknown) => chatApi(`calls/${call.id}/signals/`, "POST", { kind, payload });
    const tick = async () => {
      try {
        const state = await chatApi<CallState>(`calls/${call.id}/?after=${cursor}`);
        if (stopped) return;
        if (!["ringing", "accepted"].includes(state.status)) { cleanup(); setConnection(`Call ${state.status}`); cache.invalidateQueries({ queryKey: ["chat", "inbox"] }); return; }
        if (state.status === "accepted" && !peer.current) {
          if (!navigator.mediaDevices?.getUserMedia) throw new Error("Calls require HTTPS (or localhost) and camera/microphone permission.");
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: call.kind === "video" });
          if (stopped) { stream.getTracks().forEach(track => track.stop()); return; }
          local.current = stream;
          if (localVideo.current) localVideo.current.srcObject = stream;
          const pc = new RTCPeerConnection({ iceServers: state.ice_servers }); peer.current = pc;
          pc.ontrack = event => { if (remoteVideo.current) { remoteVideo.current.srcObject = event.streams[0]; remoteVideo.current.play().catch(() => setError("Tap Play remote audio to hear the call.")); } };
          pc.onicecandidate = event => { if (event.candidate) send("ice", event.candidate.toJSON()).catch(e => setError(e.message)); };
          pc.onconnectionstatechange = () => { setConnection(pc.connectionState); if (pc.connectionState === "failed") { setError("Connection failed. Check TURN configuration or try another network."); cleanup(); chatApi(`calls/${call.id}/`, "POST", { action: "end" }).catch(() => {}); } };
          stream.getTracks().forEach(track => pc.addTrack(track, stream));
          setConnection("Connecting");
          if (call.caller === me) { await pc.setLocalDescription(await pc.createOffer()); await send("offer", pc.localDescription?.toJSON()); }
        }
        const pc = peer.current;
        if (pc) for (const signal of state.signals) {
          if (signal.kind === "ice") candidates.push(signal.payload);
          else {
            await pc.setRemoteDescription(signal.payload);
            if (signal.kind === "offer") { await pc.setLocalDescription(await pc.createAnswer()); await send("answer", pc.localDescription?.toJSON()); }
          }
          cursor = signal.id;
        }
        if (pc?.remoteDescription) while (candidates.length) await pc.addIceCandidate(candidates.shift()!);
      } catch (e) {
        if (!stopped) { setError(e instanceof Error ? e.message : "Call failed."); cleanup(); await chatApi(`calls/${call.id}/`, "POST", { action: "end" }).catch(() => {}); cache.invalidateQueries({ queryKey: ["chat", "inbox"] }); return; }
      }
      if (!stopped) timer = setTimeout(tick, 800);
    };
    tick();
    return () => { stopped = true; clearTimeout(timer); cleanup(); };
  }, [call.id, call.caller, call.kind, me, cache]);
  const action = async (action: string) => {
    try { await chatApi(`calls/${call.id}/`, "POST", { action }); if (action !== "accept") cleanup(); cache.invalidateQueries({ queryKey: ["chat", "inbox"] }); }
    catch (e) { setError((e as Error).message); }
  };
  return <section className={styles.call} aria-label="Active call">
    <h3>{call.kind === "video" ? "Video call" : "Voice call"}: {call.status}</h3>
    <p role="status">{connection}</p>
    <div className={styles.videos}><video ref={localVideo} autoPlay muted playsInline aria-label="Your camera" /><video ref={remoteVideo} autoPlay playsInline aria-label="Remote participant" /></div>
    {call.status === "ringing" && call.caller !== me && <><button onClick={() => action("accept")}>Accept call</button><button onClick={() => action("decline")}>Decline</button></>}
    <button onClick={() => action("end")}>End call</button>
    <button onClick={() => { const value = !muted; local.current?.getAudioTracks().forEach(track => { track.enabled = !value; }); setMuted(value); }}>{muted ? "Unmute" : "Mute microphone"}</button>
    {call.kind === "video" && <button onClick={() => { const value = !cameraOff; local.current?.getVideoTracks().forEach(track => { track.enabled = !value; }); setCameraOff(value); }}>{cameraOff ? "Enable camera" : "Disable camera"}</button>}
    <button onClick={() => remoteVideo.current?.play().catch(() => setError("Audio playback was blocked by your browser."))}>Play remote audio</button>
    {error && <p role="alert">{error}</p>}
    <small>Keep this page open during the call. Calls are not recorded.</small>
  </section>;
}
