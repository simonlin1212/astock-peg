import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { TopNav } from "@/components/layout/TopNav";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display-load",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-sans-load",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono-load",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "astock-peg · A股 PEG 估值分析工具",
  description: "Open-source PEG-based valuation analysis tool for A-Share investors",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen flex flex-col">
        <TopNav />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-[var(--color-rule-3)] py-4 px-6 text-center text-xs text-[var(--color-text-3)]">
          ⚠️ 免责声明：本工具仅供学习研究与技术演示，不构成任何投资建议，亦不提供证券投资顾问服务。投资有风险，决策请咨询持牌专业机构。
        </footer>
      </body>
    </html>
  );
}
