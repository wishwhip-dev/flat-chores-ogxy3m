"use client";

import { useRef, useState } from "react";
import { Download, RefreshCw, Upload } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { database } from "@/lib/db";
import * as rota from "@/lib/data/rota";
import { useDatabaseTransfer, useStorageStatus, useStoredQuery } from "@/lib/storage/react";
import { FairnessView } from "@/components/rota/fairness-view";
import { HistoryView } from "@/components/rota/history-view";
import { PromptDialog } from "@/components/rota/prompt-dialog";
import { WeekView, type WeekViewActions } from "@/components/rota/week-view";

/** Fire-and-forget a mutation without letting a rejection go unhandled. */
const run = (promise: Promise<unknown>) => {
  void promise.catch((error: unknown) => {
    console.warn("[rota] action failed", error);
  });
};

export function RotaApp() {
  const status = useStorageStatus(database);
  const { data: state, isLoading } = useStoredQuery(database, rota.getRotaState);
  const { data: history } = useStoredQuery(database, rota.getHistory);
  const { data: fairness } = useStoredQuery(database, rota.getFairness);
  const { exportToFile, importFromFile } = useDatabaseTransfer(database);

  const [addChoreOpen, setAddChoreOpen] = useState(false);
  const [renamingFlatmateId, setRenamingFlatmateId] = useState<string | null>(null);
  const [renamingChore, setRenamingChore] = useState<rota.ChoreAssignment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const chores = state?.assignments.map((assignment) => assignment.chore) ?? [];

  const validateChoreName = (name: string, ignoreId?: string): string | null => {
    if (!name) return "Give the chore a name.";
    const duplicate = chores.some(
      (chore) => chore.id !== ignoreId && chore.name.trim().toLowerCase() === name.toLowerCase(),
    );
    if (duplicate) return "That chore is already on the rota.";
    return null;
  };

  const actions: WeekViewActions = {
    onToggleDone: (choreId, done) => run(rota.setDone(choreId, done)),
    onOverride: (choreId, flatmateId) => run(rota.setOverride(choreId, flatmateId)),
    onRenameChore: (assignment) => setRenamingChore(assignment),
    onRemoveChore: (choreId) => run(rota.removeChore(choreId)),
    onRenameFlatmate: (flatmateId) => setRenamingFlatmateId(flatmateId),
    onAddChore: () => setAddChoreOpen(true),
  };

  const renamedFlatmate = state?.flatmates.find((mate) => mate.id === renamingFlatmateId) ?? null;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-4">
        <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Chore rota
        </p>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {isLoading ? <Skeleton className="h-9 w-64" /> : state?.weekText}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Four flatmates, and every chore moves to the next person each week.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setAddChoreOpen(true)}>
              Add chore
            </Button>
            <Button onClick={() => run(rota.rotateWeek())} disabled={isLoading}>
              <RefreshCw />
              Rotate to next week
            </Button>
          </div>
        </div>
      </header>

      {status === "memory" ? (
        <Alert>
          <AlertTitle>This browser will not keep your data</AlertTitle>
          <AlertDescription>
            Storage was refused here, so everything works but is gone when this tab closes. Use
            &ldquo;Export data&rdquo; below to keep a copy.
          </AlertDescription>
        </Alert>
      ) : null}

      <Tabs defaultValue="week">
        <TabsList>
          <TabsTrigger value="week">This week</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="fairness">Fairness</TabsTrigger>
        </TabsList>

        <TabsContent value="week" className="mt-4">
          {isLoading || !state ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : (
            <WeekView state={state} actions={actions} />
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          {!history ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <HistoryView weeks={history} />
          )}
        </TabsContent>

        <TabsContent value="fairness" className="mt-4">
          {!fairness ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <FairnessView rows={fairness} />
          )}
        </TabsContent>
      </Tabs>

      <Card className="mt-auto">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm">
          <p className="text-muted-foreground">
            Everything lives in this browser only. Carry it between devices with a file.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => run(exportToFile())}>
              <Download />
              Export data
            </Button>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload />
              Import data
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="sr-only"
              aria-label="Import data file"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) run(importFromFile(file, "replace"));
                event.target.value = "";
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Add a chore: it joins the end of the rotation, so the next person in line picks it up. */}
      <PromptDialog
        open={addChoreOpen}
        onOpenChange={setAddChoreOpen}
        title="Add chore"
        description="It joins this week's rota and rotates from here on."
        label="Chore name"
        placeholder="e.g. Taking out the recycling"
        submitLabel="Add chore"
        validate={(value) => validateChoreName(value)}
        onSubmit={(name) => run(rota.addChore(name))}
      />

      {/* Rename a flatmate: the change shows everywhere names are shown. */}
      <PromptDialog
        open={renamedFlatmate !== null}
        onOpenChange={(open) => {
          if (!open) setRenamingFlatmateId(null);
        }}
        title="Rename flatmate"
        label="Name"
        placeholder="e.g. Alex"
        submitLabel="Save name"
        initialValue={renamedFlatmate?.name ?? ""}
        validate={(value) => (value ? null : "Give your flatmate a name.")}
        onSubmit={(name) => {
          if (renamedFlatmate) run(rota.renameFlatmate(renamedFlatmate.id, name));
        }}
      />

      {/* Rename a chore: this week, the tally and past history all follow. */}
      <PromptDialog
        open={renamingChore !== null}
        onOpenChange={(open) => {
          if (!open) setRenamingChore(null);
        }}
        title="Rename chore"
        label="Chore name"
        submitLabel="Save name"
        initialValue={renamingChore?.chore.name ?? ""}
        validate={(value) => validateChoreName(value, renamingChore?.chore.id)}
        onSubmit={(name) => {
          if (renamingChore) run(rota.renameChore(renamingChore.chore.id, name));
        }}
      />
    </main>
  );
}