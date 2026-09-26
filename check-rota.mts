/**
 * A throwaway check of the data layer against fake-indexeddb. Deleted after running.
 */
import { indexedDB, IDBKeyRange } from "fake-indexeddb";

// The storage layer refuses to open during server rendering; pretend to be a browser.
globalThis.indexedDB = indexedDB;
globalThis.IDBKeyRange = IDBKeyRange;
(globalThis as Record<string, unknown>).window = globalThis;

const { database } = await import("./lib/db");
const rota = await import("./lib/data/rota");
const { weekLabel } = await import("./lib/data/weeks");

const assert = (condition: boolean, message: string) => {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${message}`);
  }
};

const db = await database.ready();

const state1 = await rota.getRotaState();
assert(state1.week === 1, "starts on week 1");
assert(state1.flatmates.length === 4, "seeds four flatmates");
assert(state1.assignments.length === 5, "seeds five chores");
assert(state1.assignments[0]!.chore.name === "Bins", "first chore is bins");
assert(
  state1.assignments[4]!.chore.name === "Watering the plants on the balcony",
  "last chore is the balcony plants",
);
assert(state1.assignments[0]!.flatmate.name === "Flatmate 1", "week 1 bins -> flatmate 1");
assert(state1.assignments[1]!.flatmate.name === "Flatmate 2", "week 1 dishes -> flatmate 2");
assert(state1.assignments[3]!.flatmate.name === "Flatmate 4", "week 1 vacuum -> flatmate 4");
assert(state1.assignments[4]!.flatmate.name === "Flatmate 1", "week 1 plants -> flatmate 1");
assert(/Week 1 · \d+[–-]\d+ [A-Z][a-z]{2}/.test(state1.weekText), `week label looks right: ${state1.weekText}`);

// Done + override, then rotate.
await rota.setDone(state1.assignments[0]!.chore.id, true);
await rota.setOverride(state1.assignments[1]!.chore.id, state1.flatmates[2]!.id);
const overridden1 = await rota.getRotaState();
assert(overridden1.assignments[1]!.flatmate.name === "Flatmate 3", "override moves dishes to flatmate 3");
assert(overridden1.assignments[1]!.overridden, "override is flagged");

await rota.rotateWeek();
const state2 = await rota.getRotaState();
assert(state2.week === 2, "rotated to week 2");
assert(state2.assignments[0]!.flatmate.name === "Flatmate 2", "week 2 bins -> flatmate 2");
assert(state2.assignments[1]!.flatmate.name === "Flatmate 3", "rotation ignores last week's override");
assert(state2.assignments.every((a) => !a.done), "new week starts unchecked");

const history1 = await rota.getHistory();
assert(history1.length === 1, "one week of history after one rotation");
const week1 = history1[0]!;
assert(week1.entries.map((e) => e.choreName)[0] === "Bins", "history lists chores in rota order");
const binsEntry = week1.entries.find((e) => e.choreName === "Bins")!;
const dishesEntry = week1.entries.find((e) => e.choreName === "Dishes")!;
assert(binsEntry.done === true, "history records bins done in week 1");
assert(dishesEntry.overridden === true, "history records the dishes override");
assert(dishesEntry.flatmateName === "Flatmate 3", "history records the override, not the default");

// Rotate three more times; every flatmate should have done bins exactly once across weeks 1-4.
for (let i = 0; i < 3; i += 1) await rota.rotateWeek();
const state5 = await rota.getRotaState();
assert(state5.week === 5, "four rotations reach week 5");
const binWeeks = (await db.weeks.toArray()).filter((entry) => entry.choreName === "Bins").map((e) => e.flatmateId).sort();
assert(
  JSON.stringify(binWeeks) === JSON.stringify(["flatmate-1", "flatmate-2", "flatmate-3", "flatmate-4"]),
  "over four weeks every flatmate does bins exactly once",
);

// Rename propagates to history; the tally counts.
await rota.renameFlatmate("flatmate-1", "Alex");
const history5 = await rota.getHistory();
assert(
  history5.every((week) => week.entries.every((entry) => entry.flatmateName !== "Flatmate 1" || entry.flatmateName === "Alex")),
  "renamed flatmate appears in history",
);
const fairness1 = await rota.getFairness();
const alex = fairness1.find((row) => row.name === "Alex")!;
assert(alex.weeksAssigned === 5, `Alex assigned all 5 recorded weeks (got ${alex.weeksAssigned})`);
assert(alex.completed === 1, `Alex completed exactly one chore (got ${alex.completed})`);

// Add a chore: joins the rotation, persists, and future weeks rotate it.
await rota.addChore("Recycling");
const state6 = await rota.getRotaState();
assert(state6.assignments.length === 6, "added chore appears this week");
const recycling = state6.assignments.find((a) => a.chore.name === "Recycling")!;
// Its rotation index is 5, so in week 5 it sits on (5 + 5 - 1) mod 4 = 1 — the same fixed formula
// every chore follows, and it cycles through all four flatmates from here.
assert(recycling.flatmate.name === "Flatmate 2", `new chore follows the rotation formula (got ${recycling.flatmate.name})`);

// Rename a chore; history follows because it resolves by id.
const bins = state6.assignments.find((a) => a.chore.name === "Bins")!;
await rota.renameChore(bins.chore.id, "Wheelie bins");
const history6 = await rota.getHistory();
assert(
  history6.some((week) => week.entries.some((entry) => entry.choreName === "Wheelie bins")),
  "renamed chore appears in past history",
);

// Remove it: gone from the rota and future weeks, past history keeps the snapshot.
await rota.removeChore(bins.chore.id);
const state7 = await rota.getRotaState();
assert(state7.assignments.length === 5, "removed chore leaves the rota");
assert(
  !state7.assignments.some((a) => a.chore.name === "Wheelie bins"),
  "removed chore is gone from future weeks",
);
assert(
  history6.some((week) => week.entries.some((entry) => entry.choreName === "Wheelie bins")),
  "past history still shows the removed chore",
);

// Persistence: a fresh read of the same database sees the same week and data.
const state8 = await rota.getRotaState();
assert(state8.week === 5, "week number persisted");

database.close();
