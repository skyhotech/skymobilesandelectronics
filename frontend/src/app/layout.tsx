import type { Metadata } from "next";
import type { ReactNode } from "react";
import { QueryProvider } from "@/providers/query-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "SKY Mobile & Electronics",
  description: "Mobiles, laptops, gadgets, and electronics from SKY.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-IN">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
