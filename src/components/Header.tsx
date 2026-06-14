"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import MobileMenu from "./MobileMenu";
import ClientDiaryCue from "./ClientDiaryCue";

export const NAV = [
  { name: "Home", href: "/" },
  { name: "About Us", href: "/about" },
  { name: "Practicing Area", href: "/practicing-area" },
  { name: "Services", href: "/services" },
  { name: "Our Team", href: "/our-team" },
  { name: "Contact", href: "/contact" },
];

const playfair = "var(--font-playfair), Georgia, serif";
const inter = "var(--font-inter), system-ui, sans-serif";

export default function Header() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header
      className="sticky top-0 z-40 border-b"
      style={{
        backgroundColor: "var(--color-heritage-paper)",
        borderColor: "var(--color-heritage-border)",
      }}
    >
      <div className="relative mx-auto flex max-w-[1320px] items-center justify-between gap-6 px-6 py-5 md:px-10">
        {/* Wordmark */}
        <Link href="/" className="leading-none">
          <div
            className="text-[22px] font-bold tracking-[0.06em]"
            style={{ fontFamily: playfair, color: "var(--color-heritage-navy)" }}
          >
            NAMBIRAJ
          </div>
          <div
            className="mt-1 text-[10px] tracking-[0.32em]"
            style={{ fontFamily: inter, color: "var(--color-heritage-muted)" }}
          >
            LAW DYNASTY
          </div>
        </Link>

        {/* Centre nav */}
        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-6 md:flex lg:gap-8">
          {NAV.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="text-[12.5px] uppercase tracking-[0.14em] transition-colors"
              style={{
                fontFamily: inter,
                fontWeight: 500,
                color: isActive(item.href)
                  ? "var(--color-heritage-gold-deep)"
                  : "var(--color-heritage-navy)",
              }}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        {/* Right actions */}
        <div className="hidden items-center gap-6 md:flex">
          <div className="relative">
            <span
              className="absolute -top-1.5 right-0 h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: "var(--color-heritage-gold)" }}
            />
            <span
              className="text-[11px] uppercase tracking-[0.16em]"
              style={{ fontFamily: inter, color: "var(--color-heritage-navy)" }}
            >
              Alerts
            </span>
          </div>
          <span className="relative inline-flex">
            <Link
              href="/product"
              className="px-6 py-3 text-[11.5px] uppercase tracking-[0.16em] transition-opacity hover:opacity-90"
              style={{
                fontFamily: inter,
                fontWeight: 600,
                backgroundColor: "var(--color-heritage-navy)",
                color: "#ffffff",
              }}
            >
              Client Diary
            </Link>
            <ClientDiaryCue />
          </span>
        </div>

        <MobileMenu nav={NAV} />
      </div>
    </header>
  );
}
