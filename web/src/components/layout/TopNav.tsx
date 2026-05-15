import Link from "next/link";

interface NavItem {
  label: string;
  href: string;
}

const NAV_ITEMS: readonly NavItem[] = [
  { label: "自选行情", href: "/" },
  { label: "个股分析", href: "/analysis" },
  { label: "板块 PEG", href: "/sector" },
  { label: "新闻资讯", href: "/news" },
];

export function TopNav() {
  const today = new Date().toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <header
      className="border-b-[1.5px] bg-[var(--color-bg)]"
      style={{
        borderImage:
          "linear-gradient(90deg, var(--color-accent), var(--color-info), transparent) 1",
      }}
    >
      <div className="mx-auto max-w-[1440px] px-16 py-5">
        <div className="flex items-baseline justify-between">
          <Link href="/" className="t-h4 hover:opacity-70 transition-opacity">
            astock-peg
          </Link>
          <div className="flex items-center gap-3">
            <span className="t-meta">{today}</span>
            <span
              className="inline-block h-2 w-2 rounded-full bg-[var(--color-positive)] pulse-neon"
              aria-label="系统在线"
            />
          </div>
        </div>

        <nav className="mt-4 flex items-center justify-between">
          <ul className="flex items-center gap-8">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="t-body font-medium text-[var(--color-text-2)] hover:text-[var(--color-text)] transition-colors"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
