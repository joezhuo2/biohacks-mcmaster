"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import type { ClinicScore } from "@/lib/types";
import { useToday } from "@/hooks/useNow";
import { Button } from "../Button";
import { Empty, Skeleton } from "../Card";
import { fmtDayKey, localDayKey } from "../format";
import { spring } from "../motion";

const field =
  "h-9 w-full rounded-md bg-surface-2 px-3 text-sm text-fg placeholder:text-faint outline-none focus-visible:ring-2 focus-visible:ring-accent";

type Draft = { date: string; alsfrs: string; walk: string; note: string };

function validate(d: Draft) {
  const errors: Partial<Record<keyof Draft, string>> = {};
  if (!d.date) errors.date = "Pick a date.";
  if (d.alsfrs) {
    const n = Number(d.alsfrs);
    if (!Number.isInteger(n) || n < 0 || n > 48) errors.alsfrs = "Whole number from 0 to 48.";
  }
  if (d.walk) {
    const n = Number(d.walk);
    if (!(n > 0 && n < 300)) errors.walk = "Seconds, greater than 0.";
  }
  if (!d.alsfrs && !d.walk) errors.alsfrs = "Add ALSFRS-R, a 10 m walk time, or both.";
  return errors;
}

function AddVisit({ onAdded, onClose }: { onAdded: (s: ClinicScore) => void; onClose: () => void }) {
  const today = useToday();
  const [draft, setDraft] = useState<Draft>(() => ({
    date: today === null ? "" : localDayKey(today),
    alsfrs: "",
    walk: "",
    note: "",
  }));
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const errors = validate(draft);
  const shown = touched ? errors : { alsfrs: draft.alsfrs ? errors.alsfrs : undefined, walk: errors.walk };

  const set = (k: keyof Draft) => (e: { target: { value: string } }) => setDraft((d) => ({ ...d, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (Object.keys(errors).length) return;
    setSaving(true);
    setFailure(null);
    try {
      const saved = await api.addClinicScore({
        date: draft.date,
        alsfrsR: draft.alsfrs ? Number(draft.alsfrs) : undefined,
        walk10mSec: draft.walk ? Number(draft.walk) : undefined,
        note: draft.note.trim() || undefined,
      });
      onAdded(saved);
      onClose();
    } catch (err) {
      setFailure(err instanceof ApiError ? `Could not save: ${err.message}.` : "Could not reach the server. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-3 grid gap-3 rounded-lg bg-surface-2/50 p-4 sm:grid-cols-[9.5rem_7rem_7rem_1fr]" noValidate>
      <label className="text-xs text-muted">
        Date
        <input type="date" className={`${field} mt-1`} value={draft.date} onChange={set("date")} required />
        {shown.date && <span className="mt-1 block text-accent-strong">{shown.date}</span>}
      </label>
      <label className="text-xs text-muted">
        ALSFRS-R
        <input inputMode="numeric" className={`${field} mt-1 tabular`} placeholder="0 to 48" value={draft.alsfrs} onChange={set("alsfrs")} />
        {shown.alsfrs && <span className="mt-1 block text-accent-strong">{shown.alsfrs}</span>}
      </label>
      <label className="text-xs text-muted">
        10 m walk (s)
        <input inputMode="decimal" className={`${field} mt-1 tabular`} placeholder="14.2" value={draft.walk} onChange={set("walk")} />
        {shown.walk && <span className="mt-1 block text-accent-strong">{shown.walk}</span>}
      </label>
      <label className="text-xs text-muted">
        Note
        <input className={`${field} mt-1`} placeholder="Optional" value={draft.note} onChange={set("note")} />
      </label>
      <div className="flex items-center justify-end gap-2 sm:col-span-4">
        {failure && <span className="mr-auto text-xs text-accent-strong">{failure}</span>}
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" disabled={saving}>
          {saving ? "Saving" : "Save visit"}
        </Button>
      </div>
    </form>
  );
}

export function ClinicScores({
  scores,
  loading,
  onAdded,
}: {
  scores?: ClinicScore[];
  loading: boolean;
  onAdded: (s: ClinicScore) => void;
}) {
  const [adding, setAdding] = useState(false);
  const rows = [...(scores ?? [])].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Clinic scores</h3>
        <Button onClick={() => setAdding((a) => !a)} aria-expanded={adding} className="h-8 text-[13px]">
          {adding ? "Close" : "Add visit"}
        </Button>
      </div>
      <AnimatePresence initial={false}>
        {adding && (
          <motion.div
            key="form"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={spring}
            className="overflow-hidden"
          >
            <AddVisit onAdded={onAdded} onClose={() => setAdding(false)} />
          </motion.div>
        )}
      </AnimatePresence>
      {loading && !scores ? (
        <Skeleton className="mt-3 h-24" />
      ) : rows.length ? (
        <table className="mt-3 w-full text-left text-sm">
          <thead className="text-xs text-muted">
            <tr>
              <th className="py-2 font-medium">Date</th>
              <th className="py-2 font-medium">ALSFRS-R</th>
              <th className="py-2 font-medium">10 m walk</th>
              <th className="py-2 font-medium">Note</th>
            </tr>
          </thead>
          <tbody className="tabular">
            {rows.map((s) => (
              <tr key={s.id} className="border-t border-line">
                <td className="py-2.5 pr-4 whitespace-nowrap">{fmtDayKey(s.date)}, {s.date.slice(0, 4)}</td>
                <td className="py-2.5 pr-4">{s.alsfrsR ?? "--"}</td>
                <td className="py-2.5 pr-4 whitespace-nowrap">{s.walk10mSec == null ? "--" : `${Number(s.walk10mSec).toFixed(1)} s`}</td>
                <td className="py-2.5 text-muted">{s.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <Empty className="mt-3">No clinic visits recorded yet.</Empty>
      )}
    </div>
  );
}
