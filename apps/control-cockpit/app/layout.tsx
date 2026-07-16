import type { Metadata } from "next";
import type { ReactNode } from "react";

import "@binnagent/ui-foundation/tokens.css";
import "./styles.css";

export const metadata: Metadata = {
  title: "BinnAgent 开发者控制舱",
  description: "技术 Spike 的运行观测、复核与审计入口",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
