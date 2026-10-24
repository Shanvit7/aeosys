import type { Metadata } from "next"
import { AuditCommandCenter } from "@/components/audit-command-center"

export const instant = false

export const metadata: Metadata = {
  title: "Page audit — Aeosys",
  description:
    "Review a page for SEO and answer readiness, with evidence-linked findings and practical suggested edits.",
}

const Home = () => <AuditCommandCenter />

export default Home
