"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { FairnessRow } from "@/lib/data/rota";

/** One row per flatmate: how many weeks they were assigned chores, and how many they completed. */
export function FairnessView({ rows }: { rows: FairnessRow[] }) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Flatmate</TableHead>
            <TableHead className="text-right">Weeks assigned</TableHead>
            <TableHead className="text-right">Chores completed</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.flatmateId}>
              <TableCell className="font-medium">{row.name}</TableCell>
              <TableCell className="text-right">{row.weeksAssigned}</TableCell>
              <TableCell className="text-right">{row.completed}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}