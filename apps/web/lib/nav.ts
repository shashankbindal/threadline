import { LayoutDashboard, ScanEye, Network, Database, Scale, FlaskConical, Library, Stamp, BarChart3, Tags } from "lucide-react";
export const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/reader-lens", label: "Reader Lens", icon: ScanEye },
  { href: "/evidence-threads", label: "Evidence Threads", icon: Network },
  { href: "/brand-graph", label: "Brand Graph", icon: Database },
  { href: "/case-law", label: "Brand Case Law", icon: Scale },
  { href: "/stress-test", label: "Stress Test", icon: FlaskConical },
  { href: "/annotate", label: "Annotate", icon: Tags },
  { href: "/content", label: "Content Library", icon: Library },
  { href: "/approvals", label: "Approvals & Proof Cards", icon: Stamp },
  { href: "/evaluation", label: "Evaluation", icon: BarChart3 },
];
export const WORKFLOW = ["Brand Graph","Intent","Ingest","Reader Lens","Evidence Check","Precedents","Fix & Route","Approval","Proof Card"];
