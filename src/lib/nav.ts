// The public NAMBIRAJ company-site navigation — shared by the Header (a client
// component) and the Footer (a server component). It must live in a plain,
// non-"use client" module so both can import the real array without crossing
// the client/server boundary (importing it from the client Header turned it
// into a client-reference proxy and broke prerendering).
export const NAV = [
  { name: "Home", href: "/" },
  { name: "The Firm", href: "/about" },
  { name: "Practicing Area", href: "/practicing-area" },
  { name: "Services", href: "/services" },
  { name: "Our Team", href: "/our-team" },
  { name: "Contact", href: "/contact" },
];
