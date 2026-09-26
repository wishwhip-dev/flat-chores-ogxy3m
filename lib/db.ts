/**
 * This application's database.
 *
 * The reusable half of the setup is in `lib/storage/` and is not edited. This file is the half
 * that describes the product: which tables exist, what is indexed, how the schema has changed over
 * time, and what a first visit starts with.
 *
 * - `flatmates` — the four people sharing the rota. `order` is the fixed round-robin position.
 * - `chores` — the agreed chores. `order` is the chore's index `i` in the rotation formula.
 * - `settings` — a single row keyed `"rota"`: the current week number and the date the rota's
 *   week 1 starts on, so every week has a real date range.
 * - `completions` — this week's done checkboxes, one row per chore. Cleared when the week rotates.
 * - `overrides` — per-week hand assignments that replace the automatic rotation for one chore.
 * - `weeks` — history: a snapshot row per chore per past week, written when the rota rotates.
 */
import { defineDatabase } from "@/lib/storage/database";
import { DEFAULT_CHORES, DEFAULT_FLATMATES } from "@/lib/data/seed-data";
import { startOfWeek } from "@/lib/data/weeks";

export type Flatmate = { id: string; name: string; order: number };

export type Chore = { id: string; name: string; order: number };

export type RotaSettings = {
  key: "rota";
  /** The week the rota is currently on. Starts at 1. */
  currentWeek: number;
  /** Epoch millis of the Monday that starts week 1. */
  startDate: number;
};

export type Completion = { week: number; choreId: string; done: boolean };

export type ChoreOverride = { week: number; choreId: string; flatmateId: string };

/**
 * One past week's assignment of one chore. Names are snapshotted so history survives the chore or
 * flatmate being removed; renderers prefer the live name (so a rename shows up in history) and
 * fall back to the snapshot when the row it points at is gone.
 */
export type WeekEntry = {
  id: string;
  week: number;
  choreId: string;
  choreName: string;
  /** The chore's position in the rota when it was snapshot, so history lists it in rota order. */
  choreOrder: number;
  flatmateId: string;
  flatmateName: string;
  done: boolean;
  /** True when the assignment came from a manual override rather than the rotation. */
  overridden: boolean;
};

/** Ids are generated here so the data layer never depends on an auto-increment round trip. */
export function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const database = defineDatabase<{
  flatmates: Flatmate;
  chores: Chore;
  settings: RotaSettings;
  completions: Completion;
  overrides: ChoreOverride;
  weeks: WeekEntry;
}>({
  name: "chore-rota",
  versions: [
    {
      version: 1,
      stores: {
        flatmates: "id, order",
        chores: "id, order",
        settings: "key",
        completions: "[week+choreId], week",
        overrides: "[week+choreId], week",
        weeks: "id, week",
      },
    },
  ],
  seed: {
    tables: ["flatmates", "chores", "settings"],
    run: async (db) => {
      await Promise.all([
        db.flatmates.bulkAdd(DEFAULT_FLATMATES),
        db.chores.bulkAdd(DEFAULT_CHORES),
        db.settings.add({ key: "rota", currentWeek: 1, startDate: startOfWeek(new Date()).getTime() }),
      ]);
    },
  },
});
