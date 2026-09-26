"use client";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { HistoryWeek } from "@/lib/data/rota";

/**
 * Every past week since the rota started, newest first. Names resolve to their current spelling,
 * so a rename shows up in past weeks too, and a chore since removed keeps the name it had.
 */
export function HistoryView({ weeks }: { weeks: HistoryWeek[] }) {
  if (weeks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed px-6 py-12 text-center">
        <p className="font-medium">No past weeks yet</p>
        <p className="text-sm text-muted-foreground">
          Press &ldquo;Rotate to next week&rdquo; and each finished week will be recorded here, with
          who was assigned what and whether it got done.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {weeks.map((week) => (
        <section key={week.week} aria-label={week.weekText}>
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">{week.weekText}</h3>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Chore</TableHead>
                  <TableHead>Done by</TableHead>
                  <TableHead className="w-24 text-right">Completed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {week.entries.map((entry, index) => (
                  <TableRow key={index}>
                    <TableCell className={cn(entry.done && "text-muted-foreground line-through")}>
                      <div className="flex items-center gap-2">
                        {entry.choreName}
                        {entry.overridden ? <Badge variant="secondary">hand-assigned</Badge> : null}
                      </div>
                    </TableCell>
                    <TableCell className={cn(entry.done && "text-muted-foreground")}>
                      {entry.flatmateName}
                    </TableCell>
                    <TableCell className={cn("text-right", entry.done ? "text-muted-foreground" : "text-muted-foreground/60")}>
                      {entry.done ? "Done" : "Not done"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      ))}
    </div>
  );
}