"use client";

// SeniorDeskClient — top-level shell that owns the tab state and the
// rooms list. Renders one of three panels depending on the active tab:
// Group Chat, Private Chat, or Reminders.
//
// The rooms list lives here (rather than inside each panel) because two
// surfaces care about it: the Private Chat rail (which renders all private
// rooms with their unread counts) and the per-tab unread badge on the
// toggle pills (which shows totals to encourage opening the right tab).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBoardLiveFeed } from "@/lib/use-board-live-feed";
import GroupChatPanel from "./GroupChatPanel";
import PrivateChatPanel from "./PrivateChatPanel";
import RemindersPanel from "./RemindersPanel";

export type SeniorDeskMember = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
};

export type ChatRoomDTO = {
  id: string;
  type: "group" | "private";
  title: string;
  otherUser: {
    id: string;
    name: string;
    role: string;
    active: boolean;
  } | null;
  lastMessageAt: string | null;
  lastMessagePreview: string;
  lastMessageAuthorId: string | null;
  unreadCount: number;
};

type Tab = "group" | "private" | "reminders";

export default function SeniorDeskClient({
  me,
  members,
  isAdmin,
}: {
  me: SeniorDeskMember;
  members: SeniorDeskMember[];
  isAdmin: boolean;
}) {
  const [tab, setTab] = useState<Tab>("group");
  const [rooms, setRooms] = useState<ChatRoomDTO[]>([]);
  const [roomsLoaded, setRoomsLoaded] = useState(false);
  const [reminderUnread, setReminderUnread] = useState(0);

  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch("/api/app/chat/rooms", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setRooms((data.rooms || []) as ChatRoomDTO[]);
        setRoomsLoaded(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Initial rooms fetch, then refresh on a slow poll. Live-feed events
  // also force a quick refresh when chat.* activity arrives.
  useEffect(() => {
    fetchRooms();
    const t = setInterval(fetchRooms, 12_000);
    return () => clearInterval(t);
  }, [fetchRooms]);

  // Subscribe to the partner-wide live activity feed. When a chat.* event
  // arrives, debounce a rooms refresh so unread counts and the rail stay
  // current without us hammering the API.
  const live = useBoardLiveFeed({ boardId: null });
  useEffect(() => {
    if (live.newRows.length === 0) return;
    const hasChat = live.newRows.some(
      (r) =>
        r.action === "chat.message" || r.action === "chat.private_started"
    );
    if (!hasChat) return;
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(fetchRooms, 600);
  }, [live.newRows, fetchRooms]);

  // Reminders unread (overdue + due-today for me). Polled separately.
  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await fetch("/api/app/reminders?bucket=mine_active", {
          cache: "no-store",
        });
        if (!res.ok || !alive) return;
        const data = await res.json();
        setReminderUnread(Number(data?.dueOrOverdueCount || 0));
      } catch {
        /* ignore */
      }
    }
    load();
    const t = setInterval(load, 30_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const groupRoom = useMemo(
    () => rooms.find((r) => r.type === "group") || null,
    [rooms]
  );
  const privateRooms = useMemo(
    () => rooms.filter((r) => r.type === "private"),
    [rooms]
  );

  const groupUnread = groupRoom?.unreadCount ?? 0;
  const privateUnread = privateRooms.reduce(
    (acc, r) => acc + r.unreadCount,
    0
  );

  return (
    <div className="px-10 py-8">
      <div className="mx-auto max-w-[1280px]">
        <Header />

        <Toggle
          tab={tab}
          setTab={setTab}
          groupUnread={groupUnread}
          privateUnread={privateUnread}
          reminderUnread={reminderUnread}
        />

        <div className="mt-6">
          {tab === "group" ? (
            groupRoom ? (
              <GroupChatPanel
                room={groupRoom}
                me={me}
                memberCount={members.filter((m) => m.active).length}
                partnerId={null}
                onSent={fetchRooms}
              />
            ) : roomsLoaded ? (
              <EmptyShell label="Group Chat is initialising — refresh in a second." />
            ) : (
              <LoadingShell />
            )
          ) : tab === "private" ? (
            <PrivateChatPanel
              me={me}
              members={members.filter((m) => m.id !== me.id)}
              rooms={privateRooms}
              onRoomsChange={fetchRooms}
            />
          ) : (
            <RemindersPanel me={me} members={members} isAdmin={isAdmin} />
          )}
        </div>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div>
      <div
        className="text-[10px] uppercase tracking-[0.22em]"
        style={{
          fontFamily: "var(--font-dm-mono), monospace",
          color: "var(--color-app-copper-deep)",
        }}
      >
        Internal coordination
      </div>
      <h2
        className="mt-1 text-[40px] font-semibold tracking-tight leading-[1.1]"
        style={{
          fontFamily: "var(--font-crimson), Georgia, serif",
          color: "var(--color-app-ink)",
        }}
      >
        Senior Desk
      </h2>
      <p
        className="mt-2 text-[13px]"
        style={{
          fontFamily: "var(--font-manrope), sans-serif",
          color: "var(--color-app-fg-muted)",
        }}
      >
        Talk to the office. Group Chat reaches everyone, Private Chat is one
        person, one thread — no one else sees it.
      </p>
    </div>
  );
}

function Toggle({
  tab,
  setTab,
  groupUnread,
  privateUnread,
  reminderUnread,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  groupUnread: number;
  privateUnread: number;
  reminderUnread: number;
}) {
  const items: { key: Tab; label: string; unread: number }[] = [
    { key: "group", label: "Group Chat", unread: groupUnread },
    { key: "private", label: "Private Chat", unread: privateUnread },
    { key: "reminders", label: "Reminders", unread: reminderUnread },
  ];
  return (
    <div className="mt-7 flex items-center gap-2">
      {items.map((it) => {
        const active = tab === it.key;
        return (
          <button
            key={it.key}
            onClick={() => setTab(it.key)}
            className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-[13px] font-semibold transition-all"
            style={{
              fontFamily: "var(--font-manrope), sans-serif",
              backgroundColor: active
                ? "var(--color-app-ink)"
                : "var(--color-app-paper)",
              color: active
                ? "var(--color-app-ivory)"
                : "var(--color-app-fg-soft)",
              boxShadow: active
                ? "0 6px 16px -10px rgba(10,17,36,0.45)"
                : "0 1px 0 var(--color-app-edge)",
            }}
          >
            {it.label}
            {it.unread > 0 ? (
              <span
                className="rounded-full px-1.5 text-[10px] font-semibold tabular-nums"
                style={{
                  fontFamily: "var(--font-dm-mono), monospace",
                  backgroundColor: active
                    ? "var(--color-app-copper)"
                    : "var(--color-app-danger)",
                  color: active
                    ? "var(--color-app-copper-text)"
                    : "white",
                  minWidth: 20,
                  textAlign: "center",
                }}
              >
                {it.unread > 99 ? "99+" : it.unread}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function LoadingShell() {
  return (
    <div
      className="rounded-xl px-5 py-16 text-center"
      style={{
        backgroundColor: "var(--color-app-paper)",
        border: "1px solid var(--color-app-edge)",
      }}
    >
      <div
        className="mx-auto h-7 w-7 animate-spin rounded-full"
        style={{
          borderWidth: 2.5,
          borderStyle: "solid",
          borderColor: "var(--color-app-edge)",
          borderTopColor: "var(--color-app-copper)",
        }}
      />
    </div>
  );
}

function EmptyShell({ label }: { label: string }) {
  return (
    <div
      className="rounded-xl px-5 py-16 text-center"
      style={{
        backgroundColor: "var(--color-app-paper)",
        border: "1px dashed var(--color-app-edge)",
      }}
    >
      <p
        className="text-[14px]"
        style={{
          fontFamily: "var(--font-manrope), sans-serif",
          color: "var(--color-app-fg-muted)",
        }}
      >
        {label}
      </p>
    </div>
  );
}
