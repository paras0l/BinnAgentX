import type { Metadata } from "next";
import type { ReactNode } from "react";

import "@binnagent/ui-foundation/tokens.css";
import "./styles.css";

export const metadata: Metadata = {
  title: "BinnAgent 考研英语",
  description: "只面向电脑浏览器的考研英语读写训练空间",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
