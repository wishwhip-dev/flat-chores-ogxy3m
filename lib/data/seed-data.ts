/**
 * The agreed flatmates and chores, as fixed data.
 *
 * Kept apart from every component so the rota works before anything is typed: the database seed
 * in `lib/db.ts` writes these rows on a first visit, and the ids are stable strings so the
 * rotation maths never depends on generated ids.
 */

export const FLATMATE_COUNT = 4;

export type SeedFlatmate = { id: string; name: string; order: number };

export const DEFAULT_FLATMATES: SeedFlatmate[] = Array.from(
  { length: FLATMATE_COUNT },
  (_, index) => ({ id: `flatmate-${index + 1}`, name: `Flatmate ${index + 1}`, order: index }),
);

export type SeedChore = { id: string; name: string; order: number };

export const DEFAULT_CHORES: SeedChore[] = [
  { id: "chore-bins", name: "Bins", order: 0 },
  { id: "chore-dishes", name: "Dishes", order: 1 },
  { id: "chore-bathroom", name: "Bathroom", order: 2 },
  { id: "chore-vacuum", name: "Vacuum", order: 3 },
  { id: "chore-plants", name: "Watering the plants on the balcony", order: 4 },
];
