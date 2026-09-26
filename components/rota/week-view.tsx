"use client";

import { Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { ChoreAssignment, Flatmate, RotaState } from "@/lib/data/rota";

export type WeekViewActions = {
  onToggleDone: (choreId: string, done: boolean) => void;
  onOverride: (choreId: string, flatmateId: string | null) => void;
  onRenameChore: (assignment: ChoreAssignment) => void;
  onRemoveChore: (choreId: string, choreName: string) => void;
  onRenameFlatmate: (flatmateId: string) => void;
  onAddChore: () => void;
};

/** The select that hands this week's chore to a specific flatmate, or back to the rotation. */
function OverrideSelect({
  assignment,
  flatmates,
  onOverride,
}: {
  assignment: ChoreAssignment;
  flatmates: Flatmate[];
  onOverride: WeekViewActions["onOverride"];
}) {
  return (
    <Select
      value={assignment.flatmate.id}
      onValueChange={(value) =>
        onOverride(assignment.chore.id, value === assignment.autoFlatmate.id ? null : value)
      }
    >
      <SelectTrigger className="h-8 w-36" aria-label={`Change who does ${assignment.chore.name}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {flatmates.map((mate) => (
          <SelectItem key={mate.id} value={mate.id}>
            {mate.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** The chore's name, clickable to rename, struck through when the chore is done. */
function ChoreName({
  name,
  done,
  onRename,
}: {
  name: string;
  done: boolean;
  onRename: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onRename}
      className={cn(
        "rounded-sm text-left font-medium underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        done && "text-muted-foreground line-through",
      )}
      aria-label={`Rename chore ${name}`}
    >
      {name}
    </button>
  );
}

function FlatmateName({
  name,
  done,
  onRename,
}: {
  name: string;
  done: boolean;
  onRename: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onRename}
      className={cn(
        "rounded-sm underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        done && "text-muted-foreground",
      )}
      aria-label={`Rename flatmate ${name}`}
    >
      {name}
    </button>
  );
}

export function WeekView({ state, actions }: { state: RotaState; actions: WeekViewActions }) {
  if (state.assignments.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-12 text-center">
        <p className="font-medium">No chores yet</p>
        <p className="text-sm text-muted-foreground">
          Add the chores you and your flatmates agreed on, and the rota will rotate them for you.
        </p>
        <Button onClick={actions.onAddChore}>Add chore</Button>
      </div>
    );
  }

  const rowTone = (assignment: ChoreAssignment) => (assignment.done ? "bg-muted/40" : undefined);

  return (
    <>
      {/* Phone: one card per chore, so nothing is squeezed into a table. */}
      <ul className="flex flex-col gap-3 md:hidden">
        {state.assignments.map((assignment) => (
          <li key={assignment.chore.id} className={cn("rounded-lg border p-4", rowTone(assignment))}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <Checkbox
                  className="mt-1"
                  checked={assignment.done}
                  onCheckedChange={(checked) =>
                    actions.onToggleDone(assignment.chore.id, checked === true)
                  }
                  aria-label={`Mark ${assignment.chore.name} as done`}
                />
                <div>
                  <ChoreName
                    name={assignment.chore.name}
                    done={assignment.done}
                    onRename={() => actions.onRenameChore(assignment)}
                  />
                  <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <FlatmateName
                      name={assignment.flatmate.name}
                      done={assignment.done}
                      onRename={() => actions.onRenameFlatmate(assignment.flatmate.id)}
                    />
                    {assignment.overridden ? <Badge variant="secondary">hand-assigned</Badge> : null}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => actions.onRemoveChore(assignment.chore.id, assignment.chore.name)}
                aria-label={`Remove chore ${assignment.chore.name}`}
              >
                <Trash2 />
              </Button>
            </div>
            <div className="mt-3">
              <OverrideSelect
                assignment={assignment}
                flatmates={state.flatmates}
                onOverride={actions.onOverride}
              />
            </div>
          </li>
        ))}
      </ul>

      {/* Tablet and up: the table. */}
      <div className="hidden rounded-lg border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Done</TableHead>
              <TableHead>Chore</TableHead>
              <TableHead>Assigned to</TableHead>
              <TableHead>Change</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">Remove</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {state.assignments.map((assignment) => (
              <TableRow key={assignment.chore.id} className={rowTone(assignment)}>
                <TableCell>
                  <Checkbox
                    checked={assignment.done}
                    onCheckedChange={(checked) =>
                      actions.onToggleDone(assignment.chore.id, checked === true)
                    }
                    aria-label={`Mark ${assignment.chore.name} as done`}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <ChoreName
                      name={assignment.chore.name}
                      done={assignment.done}
                      onRename={() => actions.onRenameChore(assignment)}
                    />
                    {assignment.overridden ? <Badge variant="secondary">hand-assigned</Badge> : null}
                  </div>
                </TableCell>
                <TableCell>
                  <FlatmateName
                    name={assignment.flatmate.name}
                    done={assignment.done}
                    onRename={() => actions.onRenameFlatmate(assignment.flatmate.id)}
                  />
                </TableCell>
                <TableCell>
                  <OverrideSelect
                    assignment={assignment}
                    flatmates={state.flatmates}
                    onOverride={actions.onOverride}
                  />
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => actions.onRemoveChore(assignment.chore.id, assignment.chore.name)}
                    aria-label={`Remove chore ${assignment.chore.name}`}
                  >
                    <Trash2 />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}