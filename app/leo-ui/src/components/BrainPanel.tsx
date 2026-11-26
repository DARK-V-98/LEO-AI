"use client";

import { useEffect, useMemo, useState } from "react";
import { Brain, Plus, Trash2, BookOpen, CalendarPlus, ChevronDown, ChevronRight } from "lucide-react";
import {
  subscribePteKnowledge,
  addPteKnowledgeEntry,
  removePteKnowledgeEntry,
  PteKnowledgeEntry,
  skillOf,
} from "@/lib/pteKnowledge";
import { subscribeCourseDates, addCourseDate, removeCourseDate, CourseDate } from "@/lib/courseDates";
import { subscribeKnowledge, KnowledgeFact } from "@/lib/knowledge";
import { firebaseEnabled } from "@/lib/firebase";

const SKILL_ORDER = ["reading", "listening", "writing", "speaking", "vocabulary", "scoring", "guidance"];
const SKILL_LABEL: Record<string, string> = {
  reading: "Reading",
  listening: "Listening",
  writing: "Writing",
  speaking: "Speaking",
  vocabulary: "Vocabulary",
  scoring: "Scoring",
  guidance: "Guidance",
};

function EntryForm({ onAdded }: { onAdded: () => void }) {
  const [topic, setTopic] = useState("");
  const [tags, setTags] = useState("");
  const [question, setQuestion] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState(3);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!topic.trim() || !content.trim()) {
      setError("Topic and content are both required.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await addPteKnowledgeEntry({
        topic: topic.trim(),
        tags: tags
          .split(",")
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean),
        question: question.trim() || undefined,
        content: content.trim(),
        priority,
      });
      setTopic("");
      setTags("");
      setQuestion("");
      setContent("");
      setPriority(3);
      onAdded();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-panel-border bg-black/[0.03] p-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[10px] text-muted">Topic (e.g. writing.essay.structure)</label>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="speaking.describe-image.strategy"
            className="w-full rounded-lg border border-panel-border bg-transparent px-3 py-1.5 text-xs text-foreground outline-none focus:border-accent-cyan/60"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] text-muted">Tags (comma-separated)</label>
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="describe image, graph, chart"
            className="w-full rounded-lg border border-panel-border bg-transparent px-3 py-1.5 text-xs text-foreground outline-none focus:border-accent-cyan/60"
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-[10px] text-muted">Question this answers (optional)</label>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="How do I describe a graph?"
          className="w-full rounded-lg border border-panel-border bg-transparent px-3 py-1.5 text-xs text-foreground outline-none focus:border-accent-cyan/60"
        />
      </div>
      <div>
        <label className="mb-1 block text-[10px] text-muted">Content</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          placeholder="What LEO should actually know/say for this topic…"
          className="w-full resize-y rounded-lg border border-panel-border bg-transparent px-3 py-1.5 text-xs text-foreground outline-none focus:border-accent-cyan/60"
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-[10px] text-muted">
          Priority
          <select
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value))}
            className="rounded-lg border border-panel-border bg-transparent px-2 py-1 text-xs text-foreground"
          >
            {[1, 2, 3, 4, 5].map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-lg bg-accent-cyan/15 px-3 py-1.5 text-xs font-medium text-accent-cyan hover:bg-accent-cyan/25 disabled:opacity-50"
        >
          <Plus size={13} />
          {saving ? "Adding…" : "Add entry"}
        </button>
      </div>
      {error ? <p className="text-[11px] text-accent-magenta">{error}</p> : null}
    </div>
  );
}

function SkillGroup({ skill, entries }: { skill: string; entries: PteKnowledgeEntry[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-panel-border">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2.5 text-left"
      >
        <span className="text-xs font-medium text-foreground">
          {SKILL_LABEL[skill] ?? skill} <span className="text-muted">· {entries.length}</span>
        </span>
        {open ? <ChevronDown size={14} className="text-muted" /> : <ChevronRight size={14} className="text-muted" />}
      </button>
      {open ? (
        <div className="flex flex-col gap-1.5 border-t border-panel-border p-2">
          {entries.map((e) => (
            <div
              key={e.id}
              className="flex items-start justify-between gap-3 rounded-lg bg-black/[0.03] px-3 py-2"
            >
              <div className="min-w-0">
                <p className="font-mono text-[10px] text-accent-cyan">{e.topic}</p>
                {e.question ? <p className="mt-0.5 text-xs font-medium text-foreground">{e.question}</p> : null}
                <p className="mt-0.5 whitespace-pre-wrap text-[11px] text-muted">{e.content}</p>
                {e.tags?.length ? (
                  <p className="mt-1 text-[10px] text-muted/70">tags: {e.tags.join(", ")}</p>
                ) : null}
              </div>
              <button
                onClick={() => removePteKnowledgeEntry(e.id)}
                className="flex-shrink-0 rounded-lg p-1 text-muted hover:bg-accent-magenta/10 hover:text-accent-magenta"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CourseDatesSection() {
  const [dates, setDates] = useState<CourseDate[]>([]);
  const [courseName, setCourseName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => subscribeCourseDates(setDates), []);

  async function handleAdd() {
    if (!courseName.trim() || !startDate.trim()) return;
    setSaving(true);
    try {
      await addCourseDate(courseName, startDate, note);
      setCourseName("");
      setStartDate("");
      setNote("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="glass-panel flex flex-col gap-4 rounded-2xl p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-amber/10 text-accent-amber">
          <CalendarPlus size={16} />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">Course dates</h2>
          <p className="text-[11px] text-muted">Other details LEO/staff can reference — new batches, intakes, etc.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <input
          value={courseName}
          onChange={(e) => setCourseName(e.target.value)}
          placeholder="Course name"
          className="rounded-lg border border-panel-border bg-transparent px-3 py-1.5 text-xs text-foreground outline-none focus:border-accent-amber/60"
        />
        <input
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          placeholder="Start date (e.g. 1st Dec 2026)"
          className="rounded-lg border border-panel-border bg-transparent px-3 py-1.5 text-xs text-foreground outline-none focus:border-accent-amber/60"
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (optional)"
          className="rounded-lg border border-panel-border bg-transparent px-3 py-1.5 text-xs text-foreground outline-none focus:border-accent-amber/60"
        />
      </div>
      <button
        onClick={handleAdd}
        disabled={saving}
        className="flex items-center gap-1.5 self-start rounded-lg bg-accent-amber/15 px-3 py-1.5 text-xs font-medium text-accent-amber hover:bg-accent-amber/25 disabled:opacity-50"
      >
        <Plus size={13} />
        Add
      </button>

      <div className="flex flex-col gap-1.5">
        {dates.length === 0 ? (
          <p className="rounded-lg border border-panel-border bg-black/[0.03] p-3 text-center text-xs text-muted">
            No course dates added yet.
          </p>
        ) : (
          dates.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between rounded-lg border border-panel-border bg-black/[0.03] px-3 py-2"
            >
              <div>
                <p className="text-xs font-medium text-foreground">
                  {d.courseName} — {d.startDate}
                </p>
                {d.note ? <p className="text-[11px] text-muted">{d.note}</p> : null}
              </div>
              <button
                onClick={() => removeCourseDate(d.id)}
                className="rounded-lg p-1 text-muted hover:bg-accent-magenta/10 hover:text-accent-magenta"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function BrainPanel() {
  const [entries, setEntries] = useState<PteKnowledgeEntry[]>([]);
  const [facts, setFacts] = useState<KnowledgeFact[]>([]);

  useEffect(() => subscribePteKnowledge(setEntries), []);
  useEffect(() => subscribeKnowledge(setFacts), []);

  const grouped = useMemo(() => {
    const map = new Map<string, PteKnowledgeEntry[]>();
    for (const e of entries) {
      const skill = skillOf(e.topic);
      if (!map.has(skill)) map.set(skill, []);
      map.get(skill)!.push(e);
    }
    const skills = [...map.keys()].sort(
      (a, b) => SKILL_ORDER.indexOf(a) - SKILL_ORDER.indexOf(b) || a.localeCompare(b)
    );
    return skills.map((skill) => ({ skill, entries: map.get(skill)! }));
  }, [entries]);

  return (
    <div className="flex flex-col gap-5">
      <div className="glass-panel flex flex-col gap-4 rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-violet/10 text-accent-violet">
              <Brain size={16} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">LEO&apos;s brain</h2>
              <p className="text-[11px] text-muted">
                {entries.length} PTE knowledge entr{entries.length === 1 ? "y" : "ies"} across {grouped.length}{" "}
                section{grouped.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        </div>

        {!firebaseEnabled ? (
          <p className="text-xs text-muted">Firebase isn&apos;t configured here.</p>
        ) : (
          <>
            <p className="text-[11px] text-muted">
              Only entries relevant to what a student actually asked get sent to the model — not the whole
              brain on every message — so add as much as you want here without it costing more per reply.
            </p>
            <EntryForm onAdded={() => {}} />
            {grouped.length === 0 ? (
              <p className="rounded-lg border border-panel-border bg-black/[0.03] p-3 text-center text-xs text-muted">
                Nothing added yet — LEO has no PTE-specific training content until you add some here.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {grouped.map((g) => (
                  <SkillGroup key={g.skill} skill={g.skill} entries={g.entries} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className="glass-panel flex flex-col gap-3 rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-cyan/10 text-accent-cyan">
            <BookOpen size={16} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Company facts</h2>
            <p className="text-[11px] text-muted">General facts (not PTE-specific) — seeded by the bridge</p>
          </div>
        </div>
        {facts.length === 0 ? (
          <p className="rounded-lg border border-panel-border bg-black/[0.03] p-3 text-center text-xs text-muted">
            Nothing here yet.
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {facts.map((f) => (
              <div key={f.id} className="rounded-lg border border-panel-border bg-black/[0.03] px-3 py-2">
                <p className="text-xs text-foreground">{f.fact}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <CourseDatesSection />
    </div>
  );
}
