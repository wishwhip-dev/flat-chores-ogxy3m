/**
 * This app's data-access functions. Components call these, never Dexie directly.
 *
 * The rotation rule lives here: in week `w`, the chore at index `i` belongs to the flatmate at
 * position `(i + w - 1) mod 4` — weeks are numbered from 1, so week 1 puts chore 0 on Flatmate 1,
 * and over any four consecutive weeks every flatmate does every chore exactly once. A manual
 * override replaces the assignment for that week only and never moves the rotation.
 */
import {
  database,
  newId,
  type Chore,
  type ChoreOverride,
  type Completion,
  type Flatmate,
  type RotaSettings,
  type WeekEntry,
} from "@/lib/db";
import { startOfWeek, weekLabel } from "@/lib/data/weeks";

export type { Chore, Flatmate } from "@/lib/db";

const tables = async () => await database.ready();

const DEFAULT_SETTINGS: RotaSettings = { key: "rota", currentWeek: 1, startDate: 0 };

async function readSettings(): Promise<RotaSettings> {
  const db = await tables();
  const row = await db.settings.get("rota");
  if (row) return row;
  // Only reachable if the seed did not run; the rota still works from today.
  return { ...DEFAULT_SETTINGS, startDate: startOfWeek(new Date()).getTime() };
}

/** Position `i` of the round-robin in week `week` (weeks numbered from 1). */
function rotationIndex(index: number, week: number, count: number): number {
  return (((index + week - 1) % count) + count) % count;
}

export type ChoreAssignment = {
  chore: Chore;
  /** The flatmate doing it this week: the override if there is one, else the rotation's choice. */
  flatmate: Flatmate;
  /** The flatmate the rotation chose, which the override select resets back to. */
  autoFlatmate: Flatmate;
  done: boolean;
  overridden: boolean;
};

export type RotaState = {
  week: number;
  weekText: string;
  flatmates: Flatmate[];
  assignments: ChoreAssignment[];
};

/** Everything the "This week" view needs, in one live read. */
export async function getRotaState(): Promise<RotaState> {
  const db = await tables();
  const settings = await readSettings();
  const [flatmates, chores, completions, overrides] = await Promise.all([
    db.flatmates.orderBy("order").toArray(),
    db.chores.orderBy("order").toArray(),
    db.completions.where("week").equals(settings.currentWeek).toArray(),
    db.overrides.where("week").equals(settings.currentWeek).toArray(),
  ]);

  const doneById = new Map(completions.map((row: Completion) => [row.choreId, row.done]));
  const overrideByChore = new Map(overrides.map((row: ChoreOverride) => [row.choreId, row.flatmateId]));

  const assignments: ChoreAssignment[] = chores.map((chore, index) => {
    const autoFlatmate = flatmates[rotationIndex(index, settings.currentWeek, flatmates.length)] ?? flatmates[0]!;
    const overriddenId = overrideByChore.get(chore.id);
    const flatmate = overriddenId ? flatmates.find((mate) => mate.id === overriddenId) ?? autoFlatmate : autoFlatmate;
    return { chore, flatmate, autoFlatmate, done: doneById.get(chore.id) ?? false, overridden: overriddenId != null };
  });

  return {
    week: settings.currentWeek,
    weekText: weekLabel(settings.currentWeek, settings.startDate),
    flatmates,
    assignments,
  };
}

/* ------------------------------------------------------------------ mutations */

export async function renameFlatmate(id: string, name: string): Promise<void> {
  const db = await tables();
  await db.flatmates.update(id, { name });
}

/** Adds a chore at the end of the rotation order, which puts it on the next person in line. */
export async function addChore(name: string): Promise<void> {
  const db = await tables();
  const highest = await db.chores.orderBy("order").last();
  await db.chores.add({ id: newId(), name, order: (highest?.order ?? -1) + 1 });
}

export async function renameChore(id: string, name: string): Promise<void> {
  const db = await tables();
  await db.chores.update(id, { name });
}

/**
 * Removes a chore from the rota and every future week. Past weeks are snapshot rows keyed by id
 * with the name copied in, so history is untouched.
 */
export async function removeChore(id: string): Promise<void> {
  const db = await tables();
  const settings = await readSettings();
  // Only this week's rows for this chore — the other chores' checkboxes and overrides stay.
  await db.transaction("rw", db.chores, db.completions, db.overrides, async () => {
    await db.chores.delete(id);
    await db.completions.delete([settings.currentWeek, id]);
    await db.overrides.delete([settings.currentWeek, id]);
  });
}

/** Marks one of this week's chores done or not done. */
export async function setDone(choreId: string, done: boolean): Promise<void> {
  const db = await tables();
  const settings = await readSettings();
  await db.completions.put({ week: settings.currentWeek, choreId, done });
}

/**
 * Hands this week's chore to a specific flatmate, or clears the override when `flatmateId` is null
 * (or equals the person the rotation already chose). Future weeks are unaffected.
 */
export async function setOverride(choreId: string, flatmateId: string | null): Promise<void> {
  const db = await tables();
  const settings = await readSettings();
  const key = [settings.currentWeek, choreId];
  if (flatmateId === null) {
    await db.overrides.delete(key);
    return;
  }
  const override: ChoreOverride = { week: settings.currentWeek, choreId, flatmateId };
  await db.overrides.put(override);
}

/**
 * Records the current week into history and moves the rota on by one. Pressing it twice advances
 * two weeks; each chore moves to the next flatmate in the fixed round-robin order.
 */
export async function rotateWeek(): Promise<void> {
  const db = await tables();
  const settings = await readSettings();
  await db.transaction("rw", [db.settings, db.weeks, db.completions, db.overrides, db.chores, db.flatmates], async () => {
    const [flatmates, chores, completions, overrides] = await Promise.all([
      db.flatmates.orderBy("order").toArray(),
      db.chores.orderBy("order").toArray(),
      db.completions.where("week").equals(settings.currentWeek).toArray(),
      db.overrides.where("week").equals(settings.currentWeek).toArray(),
    ]);
    const doneById = new Map(completions.map((row) => [row.choreId, row.done]));
    const overrideByChore = new Map(overrides.map((row) => [row.choreId, row.flatmateId]));
    const week = settings.currentWeek;

    const entries: WeekEntry[] = chores.map((chore, index) => {
      const autoFlatmate = flatmates[rotationIndex(index, week, flatmates.length)] ?? flatmates[0]!;
      const overriddenId = overrideByChore.get(chore.id);
      const flatmate = overriddenId ? flatmates.find((mate) => mate.id === overriddenId) ?? autoFlatmate : autoFlatmate;
      return {
        id: newId(),
        week,
        choreId: chore.id,
        choreName: chore.name,
        choreOrder: chore.order,
        flatmateId: flatmate.id,
        flatmateName: flatmate.name,
        done: doneById.get(chore.id) ?? false,
        overridden: overriddenId != null,
      };
    });

    if (entries.length > 0) await db.weeks.bulkAdd(entries);
    await db.completions.where("week").equals(week).delete();
    await db.overrides.where("week").equals(week).delete();
    await db.settings.update("rota", { currentWeek: week + 1 });
  });
}

/* ------------------------------------------------------------------- history */

export type HistoryEntry = {
  choreName: string;
  flatmateName: string;
  done: boolean;
  overridden: boolean;
};

export type HistoryWeek = {
  week: number;
  weekText: string;
  entries: HistoryEntry[];
};

/**
 * Every past week, newest first. Names resolve to their current spelling — so a rename shows up in
 * history too — falling back to the snapshot when the chore or flatmate has since been removed.
 */
export async function getHistory(): Promise<HistoryWeek[]> {
  const db = await tables();
  const [settings, flatmates, chores, entries] = await Promise.all([
    readSettings(),
    db.flatmates.toArray(),
    db.chores.toArray(),
    db.weeks.toArray(),
  ]);
  const choreNames = new Map(chores.map((chore) => [chore.id, chore.name]));
  const flatmateNames = new Map(flatmates.map((mate) => [mate.id, mate.name]));

  const byWeek = new Map<number, WeekEntry[]>();
  for (const entry of entries) {
    const group = byWeek.get(entry.week) ?? [];
    group.push(entry);
    byWeek.set(entry.week, group);
  }

  return [...byWeek.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([week, rows]) => ({
      week,
      weekText: weekLabel(week, settings.startDate),
      entries: rows
        .sort((a, b) => a.choreOrder - b.choreOrder)
        .map((row) => ({
        choreName: choreNames.get(row.choreId) ?? row.choreName,
        flatmateName: flatmateNames.get(row.flatmateId) ?? row.flatmateName,
        done: row.done,
        overridden: row.overridden,
      })),
    }));
}

/* ------------------------------------------------------------------ fairness */

export type FairnessRow = {
  flatmateId: string;
  name: string;
  /** Weeks in which this flatmate had at least one chore assigned. */
  weeksAssigned: number;
  /** Chores actually marked done, across every recorded week including this one. */
  completed: number;
};

/**
 * The tally that makes imbalance visible: weeks assigned and chores completed per flatmate, over
 * every recorded week (history) plus the current one.
 */
export async function getFairness(): Promise<FairnessRow[]> {
  const db = await tables();
  const settings = await readSettings();
  const [flatmates, completions, overrides] = await Promise.all([
    db.flatmates.orderBy("order").toArray(),
    db.completions.where("week").equals(settings.currentWeek).toArray(),
    db.overrides.where("week").equals(settings.currentWeek).toArray(),
  ]);

  const weeks = new Map<string, Set<number>>();
  const completed = new Map<string, number>();
  for (const mate of flatmates) {
    weeks.set(mate.id, new Set());
    completed.set(mate.id, 0);
  }

  const countPast = async () => {
    const past = await db.weeks.toArray();
    for (const entry of past) {
      if (!weeks.has(entry.flatmateId)) continue; // A flatmate row can only be renamed, not removed.
      weeks.get(entry.flatmateId)!.add(entry.week);
      if (entry.done) completed.set(entry.flatmateId, (completed.get(entry.flatmateId) ?? 0) + 1);
    }
  };

  const chores = await db.chores.orderBy("order").toArray();
  const doneByChore = new Map(completions.map((row) => [row.choreId, row.done]));
  const overrideByChore = new Map(overrides.map((row) => [row.choreId, row.flatmateId]));

  const week = settings.currentWeek;
  for (const mate of flatmates) weeks.get(mate.id)!.add(week); // Everyone on the rota is assigned this week.
  for (const [index, chore] of chores.entries()) {
    const auto = flatmates[rotationIndex(index, week, flatmates.length)] ?? flatmates[0]!;
    const flatmateId = overrideByChore.get(chore.id) ?? auto.id;
    if (!weeks.has(flatmateId)) continue;
    if (doneByChore.get(chore.id)) completed.set(flatmateId, (completed.get(flatmateId) ?? 0) + 1);
  }

  await countPast();

  return flatmates.map((mate) => ({
    flatmateId: mate.id,
    name: mate.name,
    weeksAssigned: weeks.get(mate.id)!.size,
    completed: completed.get(mate.id) ?? 0,
  }));
}
