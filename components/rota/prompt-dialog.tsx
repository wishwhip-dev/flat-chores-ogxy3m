"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * The one small form every dialog here needs: a single text field, an inline validation message,
 * and a submit that refuses to close on invalid input. Used for renaming a flatmate, renaming a
 * chore and adding a chore.
 *
 * The form is a separate component so it mounts fresh with each opening of the dialog — Radix
 * unmounts the content when it closes, which resets the field without an effect.
 */
export function PromptDialog({
  open,
  onOpenChange,
  title,
  description,
  label,
  placeholder,
  submitLabel,
  initialValue = "",
  validate,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  label: string;
  placeholder?: string;
  submitLabel: string;
  initialValue?: string;
  /** Returns the inline error message for invalid input, or null when it is acceptable. */
  validate: (value: string) => string | null;
  onSubmit: (value: string) => void | Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <PromptForm
          title={title}
          description={description}
          label={label}
          placeholder={placeholder}
          submitLabel={submitLabel}
          initialValue={initialValue}
          validate={validate}
          onSubmit={onSubmit}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function PromptForm({
  title,
  description,
  label,
  placeholder,
  submitLabel,
  initialValue,
  validate,
  onSubmit,
  onClose,
}: {
  title: string;
  description?: string;
  label: string;
  placeholder?: string;
  submitLabel: string;
  initialValue: string;
  validate: (value: string) => string | null;
  onSubmit: (value: string) => void | Promise<void>;
  onClose: () => void;
}) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const trimmed = value.trim();
    const message = validate(trimmed);
    if (message) {
      setError(message);
      return;
    }
    await onSubmit(trimmed);
    onClose();
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        {description ? <DialogDescription>{description}</DialogDescription> : null}
      </DialogHeader>
      <div className="grid gap-2 py-4">
        <Label htmlFor="prompt-dialog-input">{label}</Label>
        <Input
          id="prompt-dialog-input"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            if (error) setError(null);
          }}
          placeholder={placeholder}
          autoFocus
          aria-invalid={error ? true : undefined}
        />
        {error ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}
      </div>
      <DialogFooter>
        <Button type="submit">{submitLabel}</Button>
      </DialogFooter>
    </form>
  );
}