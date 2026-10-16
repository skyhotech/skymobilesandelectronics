"use client";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Chat } from "@/components/chat/chat";
import { chatApi } from "@/lib/chat-api";

export default function EmployeeChatPage() {
  const cache = useQueryClient();
  const router = useRouter();
  return <main style={{ maxWidth: 1200, margin: "auto", padding: 20 }}><header style={{ display: "flex", justifyContent: "space-between", gap: 20 }}><h1>SKY employee chat</h1><button onClick={async () => { await chatApi("session/", "DELETE"); cache.removeQueries({ queryKey: ["chat"] }); router.replace("/employee/login"); }}>Sign out</button></header><Chat /></main>;
}
