"use client";

import { useMemo, useState } from "react";

import type { ScheduleEvent } from "@/lib/schemas/schedule";

import EventEditor from "./EventEditor";
import ScheduleActions from "./ScheduleActions";
import ScheduleList from "./ScheduleList";

type Props = {
  initialEvents: ScheduleEvent[];
  icsUrl?: string;
};

export default function ScheduleWorkspace({ initialEvents, icsUrl }: Props) {
  const [events, setEvents] = useState<ScheduleEvent[]>(initialEvents);
  const [editing, setEditing] = useState<ScheduleEvent | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()),
    [events],
  );

  const refresh = async () => {
    try {
      const response = await fetch("/api/schedule", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      setEvents(Array.isArray(data.items) ? data.items : []);
    } catch (error) {
      console.warn(error);
    }
  };

  const handleCreate = () => {
    setEditing(null);
    setShowEditor(true);
  };

  const handleEdit = (event: ScheduleEvent) => {
    setEditing(event);
    setShowEditor(true);
  };

  const handleDelete = async (eventId: string) => {
    const confirmed = window.confirm("このイベントをキャンセルしますか？");
    if (!confirmed) return;
    await fetch(`/api/schedule/${eventId}`, { method: "DELETE" });
    setStatusMessage("イベントをキャンセルしました");
    void refresh();
  };

  const handleSave = async (payload: Partial<ScheduleEvent>) => {
    const body = {
      title: payload.title,
      description: payload.description,
      startsAt: payload.startsAt,
      endsAt: payload.endsAt,
      timezone: payload.timezone,
      location: payload.location,
      attendees: payload.attendees,
      status: payload.status,
    };
    if (editing) {
      await fetch(`/api/schedule/${editing.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      setStatusMessage("イベントを更新しました");
    } else {
      await fetch(`/api/schedule`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      setStatusMessage("イベントを作成しました");
    }
    setShowEditor(false);
    setEditing(null);
    void refresh();
  };

  return (
    <div className="space-y-4">
      <ScheduleActions
        onCreate={handleCreate}
        onProposals={async () => {
          const response = await fetch("/api/schedule/suggest", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({}),
          });
          if (!response.ok) {
            setStatusMessage("AI 提案に失敗しました");
            return [];
          }
          const data = await response.json();
          return (data.proposals ?? []) as Partial<ScheduleEvent>[];
        }}
        onAcceptProposal={async (proposal) => {
          await fetch(`/api/schedule`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              title: proposal.title,
              description: proposal.description,
              startsAt: proposal.startsAt,
              endsAt: proposal.endsAt,
              timezone: proposal.timezone,
              location: proposal.location,
              attendees: proposal.attendees,
            }),
          });
          setStatusMessage("提案を追加しました");
          void refresh();
        }}
        icsUrl={icsUrl}
      />

      <div className="card" aria-live="polite">
        {statusMessage && <p className="text-sm text-[color:var(--color-text-muted)]">{statusMessage}</p>}
        <ScheduleList events={sortedEvents} onEdit={handleEdit} onDelete={handleDelete} />
      </div>

      <EventEditor
        open={showEditor}
        initialValue={editing ?? undefined}
        onClose={() => {
          setShowEditor(false);
          setEditing(null);
        }}
        onSave={handleSave}
      />
    </div>
  );
}
