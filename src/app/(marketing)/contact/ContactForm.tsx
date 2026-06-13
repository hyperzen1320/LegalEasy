"use client";

import { useState } from "react";

// Scaffold contact form. With no backend yet, submitting composes a mailto:
// to the office address (works everywhere, nothing to wire). Swap the
// OFFICE_EMAIL and, when ready, point `onSubmit` at a real API route.
const OFFICE_EMAIL = "chambers@legaleasy.in"; // PLACEHOLDER — replace.

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const subj = encodeURIComponent(subject || `Enquiry from ${name || "website"}`);
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\n\n${message}`
    );
    window.location.href = `mailto:${OFFICE_EMAIL}?subject=${subj}&body=${body}`;
  }

  const field =
    "mt-2 block w-full border border-ink/20 bg-paper px-4 py-3 font-body text-[15px] text-ink outline-none transition-colors focus:border-ink";
  const label =
    "font-mono text-[10px] uppercase tracking-[0.22em] text-brass-deep";

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="cf-name">
            Name
          </label>
          <input
            id="cf-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className={field}
            placeholder="Your name"
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
      </div>
      <div>
        <label className={label} htmlFor="cf-subject">
          Subject
        </label>
        <input
          id="cf-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className={field}
          placeholder="Briefly, what is this about?"
        />
      </div>
      <div>
        <label className={label} htmlFor="cf-message">
          Message
        </label>
        <textarea
          id="cf-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          rows={6}
          className={`${field} resize-none`}
          placeholder="Tell us about your matter…"
        />
      </div>
      <button
        type="submit"
        className="group inline-flex items-center gap-2 border border-ink bg-ink px-6 py-3.5 font-mono text-[11px] uppercase tracking-[0.18em] text-paper transition-colors hover:bg-ink-2"
      >
        Send message
        <span className="text-brass transition-transform duration-200 group-hover:translate-x-1">
          →
        </span>
      </button>
    </form>
  );
}
