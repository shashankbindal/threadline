import "./globals.css";
import type { Metadata } from "next";
import { AuthProvider } from "@/components/Auth";
import Shell from "@/components/Shell";
export const metadata: Metadata = { title: "Threadline — Brand Governance", description: "Impression-first brand governance" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><AuthProvider><Shell>{children}</Shell></AuthProvider></body></html>;
}
