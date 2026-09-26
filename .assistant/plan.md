# Plan

Goal: A chore rota for my four flatmates. Use the chores we already agreed on and rotate who does each one every week, so it stays fair.

1. On first open the app lands on a 'This week' view: a table with one row per chore showing the chore name, the flatmate assigned to it this week, and the week's date range (e.g. 'Week 3 · 17–23 Mar'), so the rota is usable the moment the page loads.
2. The app seeds itself with four flatmates (initially named Flatmate 1–4 until renamed) and the five agreed chores (bins, dishes, bathroom, vacuum, watering the plants on the balcony), defined as fixed data in a module under lib/data separate from any component, so the rota works before anything is typed.
3. Clicking a flatmate's name opens a dialog to rename them; the new name immediately appears in the rota table, the history and the fairness tally, and submitting a blank name is rejected with an inline message.
4. Clicking an 'Add chore' button (plain, visible and enabled on the page) opens a dialog asking for the chore name; submitting adds the chore as a new row in this week's rota, assigned to the next person in rotation, and it persists across reload; an empty name or a name duplicating an existing chore is rejected with an inline message.
5. Each chore row has a remove control that deletes it from the rota and from future weeks without disturbing past weeks' history; if every chore is removed, the table area shows a clear 'no chores yet' message with the 'Add chore' button still available.
6. Each chore name can be edited via a dialog, and the new name appears in this week's rota, in the fairness tally and in past history entries for weeks the chore existed.
7. A 'Rotate to next week' button advances the rota: every chore moves to the next flatmate in a fixed round-robin order (chore i goes to flatmate (i + week) mod 4), so over any four consecutive weeks each flatmate does every chore exactly once; pressing it twice advances two weeks, and the week label in the header advances by one each press.
8. Each chore row this week has a checkbox to mark it done; completed chores show a visible done state (struck-through name, muted row) in the table, are counted in the fairness tally, and their done state survives a reload mid-week.
9. A history tab shows a table of every past week since the rota started, listing which flatmate was assigned each chore that week, including any manual overrides and whether it was marked done; before any week has been rotated it shows a 'no past weeks yet' message instead of an empty table.
10. A fairness tab shows a table with one row per flatmate giving the number of weeks assigned and the number of chores completed across all recorded weeks, so imbalance is visible at a glance.
11. For any week, a per-chore control (a select of the four flatmates) lets the user override the automatic assignment and hand that week's chore to a specific flatmate (e.g. someone away); the history records the override rather than the default, and future weeks' rotation order is unchanged by the override.
12. The rota, flatmate names, chores, current week number, completions and overrides are saved in the browser database, so reloading the page shows exactly the state that was there, including whatever the user just added.
13. All primary actions (rotating the week, adding a chore, renaming, marking done) work from the keyboard: buttons and checkboxes are focusable and operable with Tab, Enter and Space, and dialogs close with Escape.
14. At phone width the weekly rota stacks into a readable card-per-chore layout rather than a squeezed table, and the rotate and add controls remain reachable without horizontal scrolling.

These are the outcomes this task is judged against.

## The owner's answers

- Q: Which chores did you and your flatmates agree on? You mentioned using the ones you already agreed on, but they aren't listed in the request.
  A: Bins, dishes, bathroom, vacuum; Also watering the plants on the balcony.

Build to these answers; they override any assumption the plan made.