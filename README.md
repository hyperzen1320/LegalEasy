<div align="center">

# ⚖️ LegalEasy

### _The advocate office, finally on your screen._

**Case vault · Hearing track · Client crew · Court hub · AI assistant · Work flow boards · RBAC team**

[![Next.js 16](https://img.shields.io/badge/Next.js-16.2-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React 19](https://img.shields.io/badge/React-19.1-61DAFB?style=for-the-badge&logo=react&logoColor=000)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-13AA52?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)
[![Tailwind v4](https://img.shields.io/badge/Tailwind-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Auth.js v5](https://img.shields.io/badge/Auth.js-v5-000000?style=for-the-badge)](https://authjs.dev)

![Phase](https://img.shields.io/badge/phase-1%20MVP-c5853a?style=flat-square)
![Region](https://img.shields.io/badge/region-Mumbai%20%E2%80%A2%20IN-1f4e54?style=flat-square)
![License](https://img.shields.io/badge/license-Proprietary-6b2737?style=flat-square)
![Maintained](https://img.shields.io/badge/maintained-yes-3a5a40?style=flat-square)

</div>

---

## 🪶 What is this?

A practising advocate's life is twelve open tabs, three diaries, a WhatsApp signal storm, and a stack of yellow files. **LegalEasy** collapses all of that into a single office workspace — designed for Indian legal practice, written like a love letter to good design.

Two clients, one backend, one MongoDB:

- 🖥️ **Web app** _(this repo)_ — Next.js 16 partner-side console
- 📱 **Mobile app** — Expo SDK 54 → [`LegalEasyMobileApp`](https://github.com/hyperzen1320/LegalEasyMobileApp)

Both share the same Mongo, the same role-based access, the same advocate office.

---

## 🎨 The aesthetic — _Midnight Counsel_

| | |
|---|---|
| 🟫 **Canvas** | `#f4ede0` — warm cream paper |
| ⚫ **Ink** | `#0a1124` — courtroom-navy |
| 🟠 **Copper** | `#c5853a` — gilded brass accents |
| 🤍 **Ivory** | `#f5ebd6` — soft highlight |
| 🌊 **Aqua** | `#56a0a8` — status pills |

Typography: **Crimson Pro** (display) · **Manrope** (body) · **DM Mono** (caps & metadata)

> _"The look of a good chambers — paper, brass, leather-bound, and quietly confident."_

---

## ✨ Features

### 📁 Case Vault
- Full case record: file no., case no., I.A., CNR, parties, court, status, hearing dates
- Tenant-scoped by `partnerId` — every query auto-filtered, zero cross-leak
- Hearing history archive (auto-pushes the previous date when next-date changes)
- Search across file/case/CNR/party/court · Pre-fetched detail navigation

### 🧑‍⚖️ Hearing Track
- Today / Tomorrow / Pending tabs with live counts (IST-aware)
- One-tap **Call**, **WhatsApp** (with a pre-written professional reminder), **Open**
- Inline next-date update on the Pending tab → row exits the bucket on save

### 👥 Client Crew
- Client directory with phone, WhatsApp, email, address
- Auto-counts cases per client (by `clientId` or fallback name match)
- Call / WhatsApp / Email buttons baked into every card

### 🏛️ Court Hub
- Reusable court master — name, hall/court number, place
- Case-count badges roll up automatically
- 7 office defaults seeded on first visit

### 🪄 AI Assistant
- 12 professionally drafted prompt templates (Plaints, Written Statements, Affidavits, Sec 482 quashing, Bail under 437/439, Anticipatory bail under 438, Vakalatnama, Adjournment, Cross-exam plan, Notice + reply, Judgment summary)
- Editable per-partner library — every change persists to Mongo
- Curated research-tools deck (Indian Kanoon, SCC Online, Manupatra, ChatGPT, Claude)

### 🗂️ Work Flow
- Trello-style boards with 7 colour presets (forest · copper · sea · terracotta · ochre · plum · ink)
- 7 office defaults seeded on first visit (New Suits & Petitions, Notices, I.A.s / Petitions, C. A.s, BATTAs, Follow-ups, Instructions)
- Sort / search / colour-pick / create / soft-delete

### 🔐 Users / Advocates with **RBAC**
- 5 roles: **Admin · Advocate · Junior · Clerk · Viewer** with colour-coded pills
- Office admin can add staff (email + password + role + designation), reset passwords, deactivate, remove
- Server-enforced permissions, partner-scoped data, can't self-deactivate

### 📊 Dashboard
- Real-time tiles — Today · Tomorrow · Pending · Vault counts
- Today's board (cause-list)
- Phase-2 callouts wired (Senior Desk pending)

### 🪪 My Profile
- 8 fields (name, phone, email-locked, state, country, bar enrolment, designation, office address)
- View / edit toggle with the same partner-side API used by mobile

---

## 🏗️ Stack

```
┌─────────────────────────────────────────┐
│  Next.js 16 · App Router · Turbopack    │
│  React 19 · TypeScript 5.9              │
│  Tailwind v4 (@theme blocks)            │
│  Auth.js v5 (cookie + JWT for mobile)   │
│  Mongoose 9.5 · MongoDB Atlas (Mumbai)  │
│  bcryptjs · jose · framer-motion        │
└─────────────────────────────────────────┘
```

**Notable choices**
- 🔁 Same `/api/app/*` endpoints power both web and mobile via `requirePartner` (cookie OR JWT)
- 🗓️ Asia/Kolkata (IST) midnight math centralised in `src/lib/ist-day.ts`
- 🌱 Lazy seeding pattern — defaults (boards, prompt templates) seed per-partner on first visit
- 🎯 Next 16's `proxy.ts` (formerly `middleware.ts`)
- 🧪 Type-checked end-to-end, every endpoint tenant-scoped server-side

---

## 🚀 Getting started

### 1. Clone & install
```bash
git clone https://github.com/hyperzen1320/LegalEasy.git
cd LegalEasy
npm install
```

### 2. Environment
Create `.env.local` in the project root:
```bash
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/legaleasy
AUTH_SECRET=<openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000
JWT_SECRET=<another long secret for mobile JWT>
```

### 3. Run
```bash
npm run dev
# → http://localhost:3000
```

### 4. First login
- Sign up at `/signup` (creates a partner office + admin user)
- Or run a seed script under `scripts/`

---

## 📂 Project structure

```
src/
├── app/
│   ├── (marketing)/         · Landing pages
│   ├── admin/               · Global-admin console
│   ├── app/                 · Partner office workspace
│   │   ├── ai/              · AI Assistant + prompt CRUD
│   │   ├── cases/           · Case Vault list + detail + new
│   │   ├── clients/         · Client Crew
│   │   ├── courts/          · Court Hub
│   │   ├── hearings/        · Hearing Track (today/tmrw/pending)
│   │   ├── profile/         · My Profile
│   │   ├── users/           · Users / Advocates (RBAC)
│   │   ├── workflow/        · Work Flow boards
│   │   └── components/      · Sidebar, Topbar, shared UI
│   ├── api/
│   │   ├── admin/*          · Global admin endpoints
│   │   ├── app/*            · Partner-side endpoints (cookie + JWT)
│   │   └── mobile/*         · Mobile-only auth shims
│   └── layout.tsx
├── auth.ts                  · Auth.js v5 config
├── auth.config.ts           · Edge-safe authorize callback
├── proxy.ts                 · Next 16 routing proxy (formerly middleware)
├── lib/
│   ├── db.ts                · Mongo singleton
│   ├── partner-auth.ts      · requirePartner() → ctx with partnerId
│   ├── jwt.ts               · Mobile JWT verify/sign
│   ├── ist-day.ts           · IST midnight helper
│   ├── hearings-bucket.ts   · today/tmrw/pending shared logic
│   ├── prompt-defaults.ts   · 12 seeded legal prompts
│   └── board-defaults.ts    · 7 seeded boards + colour presets
└── models/
    ├── User.ts              · userType + role (RBAC) + profile fields
    ├── Partner.ts           · Office record + branding + subscription
    ├── Case.ts              · Case + embedded hearings[]
    ├── Client.ts            · Client directory
    ├── Court.ts             · Court master
    ├── PromptTemplate.ts    · AI prompt library
    ├── Board.ts             · Work Flow boards
    ├── Activity.ts          · Audit log
    ├── Plan.ts              · Subscription plans
    └── AccessRequest.ts     · Office signup requests
```

---

## 🛡️ Tenancy & permissions

| | |
|---|---|
| 🏢 **Tenant scoping** | Every partner-side query filtered by `partnerId` from `requirePartner(request)` |
| 🔐 **Auth** | Auth.js cookie session (web) **OR** Bearer JWT (mobile) — same endpoint, same guard |
| 👮 **Roles** | `partner_admin` (auth scope) + `role` (RBAC: admin · advocate · junior · clerk · viewer) |
| 🚫 **Soft delete** | Every model has `isDeleted` — nothing is hard-removed |
| 📜 **Audit trail** | `Activity` model logs creates/updates with before/after diffs |

---

## 🌑 Theme tokens (CSS variables)

```css
--color-app-canvas:        #f4ede0;
--color-app-canvas-2:      #efe5d0;
--color-app-paper:         #ffffff;
--color-app-ink:           #0a1124;
--color-app-ivory:         #f5ebd6;
--color-app-copper:        #c5853a;
--color-app-copper-deep:   #8a5821;
--color-app-copper-text:   #2a1c08;
--color-app-aqua:          #56a0a8;
--color-app-aqua-soft:     #d2e6e7;
--color-app-danger:        #c14a37;
--color-app-danger-soft:   #f6dccd;
```

---

## 🛣️ Roadmap

- [x] **Phase 1 MVP** — Cases · Clients · Courts · Hearings · AI · Profile · Users RBAC · Work Flow boards
- [ ] **Phase 1.5** — Kanban detail (lists + task cards + drag/drop) inside boards
- [ ] **Phase 2** — Senior Desk reminders · Office invites with magic-link accept · Hearing report CSV export · Activity timeline UI

---

## 💌 The advocate's pact

> _All AI-generated drafts must be verified, edited and signed by an advocate before filing._

LegalEasy is a tool, never the lawyer. The judgement, the responsibility, the seal — those are yours.

---

<div align="center">

**Built for the Indian advocate.**
Designed in Chennai · Tested in chambers · Shipped from Mumbai

⚖️ _Justice deserves better tooling._

</div>
