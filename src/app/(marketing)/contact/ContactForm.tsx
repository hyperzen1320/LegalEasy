"use client";

import { useState } from "react";

// Inquiry form for the NAMBIRAJ contact page. With no inquiries backend yet,
// submitting composes a well-formatted mailto: to the office inbox — it works
// everywhere and nothing has to be wired. When a real endpoint lands, point
// `onSubmit` at it and keep the same fields.
const OFFICE_EMAIL = "nambirajlawdynasty@gmail.com";

const INQUIRY_TYPES = [
  "Civil Matter",
  "Criminal Matter",
  "Property Dispute",
  "Corporate Advisory",
  "Family Law",
  "Other",
];

const inter = "var(--font-inter), system-ui, sans-serif";

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [type, setType] = useState(INQUIRY_TYPES[0]);
  const [description, setDescription] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const subject = encodeURIComponent(
      `Inquiry: ${type} — ${name || "Website"}`
    );
    const body = encodeURIComponent(
      [
        `Name: ${name}`,
        `Email: ${email}`,
        `Phone: ${phone || "—"}`,
        `Inquiry type: ${type}`,
        "",
        "Brief description:",
        description,
      ].join("\n")
    );
    window.location.href = `mailto:${OFFICE_EMAIL}?subject=${subject}&body=${body}`;
  }

  const label =
    "block text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-heritage-gold-deep)]";
  const field =
    "mt-2 block w-full rounded-none border border-[var(--color-heritage-border)] bg-white px-4 py-3 text-[15px] text-[var(--color-heritage-navy)] outline-none transition-colors focus:border-[var(--color-heritage-navy)]";

  return (
    <form onSubmit={onSubmit} className="space-y-6" style={{ fontFamily: inter }}>
      <div>
        <label className={label} htmlFor="cf-name">
          Full Name
        </label>
        <input
          id="cf-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className={field}
          placeholder="Your full name"
        />
      </div>

      <div>
        <label className={label} htmlFor="cf-email">
          Email
        </label>
        <input
          id="cf-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className={field}
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label className={label} htmlFor="cf-phone">
          Phone
        </label>
        <input
          id="cf-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className={field}
          placeholder="+91 00000 00000"
        />
      </div>

      <div>
        <label className={label} htmlFor="cf-type">
          Inquiry Type
        </label>
        <select
          id="cf-type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className={`${field} cursor-pointer appearance-none bg-[length:18px] bg-[right_1rem_center] bg-no-repeat pr-10`}
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%231a2238' stroke-width='1.8'><path d='M6 9l6 6 6-6'/></svg>\")",
          }}
        >
          {INQUIRY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={label} htmlFor="cf-desc">
          Brief Description
        </label>
        <textarea
          id="cf-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          rows={5}
          className={`${field} resize-none`}
          placeholder="Tell us briefly about your matter…"
        />
      </div>

      <button
        type="submit"
        className="w-full px-6 py-4 text-[12px] font-semibold uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: "var(--color-heritage-navy)" }}
      >
        Submit Inquiry
      </button>
    </form>
  );
}
