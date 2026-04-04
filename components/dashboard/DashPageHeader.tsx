"use client";

import type { ReactNode } from "react";
import { dash } from "@/components/dashboard/dashTokens";

export function DashPageHeader({
  title,
  subtitle,
  right
}: {
  title: string;
  subtitle: string;
  right?: ReactNode;
}) {
  return (
    <header
      style={{
        ...dash.pageHeaderWrap,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap"
      }}
    >
      <div>
        <h1 style={dash.pageTitle}>{title}</h1>
        <p style={dash.pageSubtitle}>{subtitle}</p>
      </div>
      {right}
    </header>
  );
}
