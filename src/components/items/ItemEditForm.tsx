"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { updateItemAction } from "@/actions/items";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { type ItemDetailPayload } from "@/lib/db/items";
import { getSystemTypeStyle } from "@/lib/item-types";
import { cn } from "@/lib/utils";

// Tags round-trip through a single comma-separated input. Splitting is
// forgiving (blank entries dropped); the server does the authoritative trim,
// dedupe and validation.
function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}

// Edit mode for the item drawer. Renders the whole panel — header included —
// rather than only the body, so every field and the Save button share one piece
// of local state without lifting it into ItemDrawer.
export function ItemEditForm({
  detail,
  onCancel,
  onSaved,
}: {
  detail: ItemDetailPayload;
  onCancel: () => void;
  onSaved: (updated: ItemDetailPayload) => void;
}) {
  const router = useRouter();
  const {
    icon: Icon,
    iconColor,
    label,
    editFields,
  } = getSystemTypeStyle(detail.typeName);

  const [title, setTitle] = useState(detail.title);
  const [description, setDescription] = useState(detail.description ?? "");
  const [content, setContent] = useState(detail.content ?? "");
  const [url, setUrl] = useState(detail.url ?? "");
  const [language, setLanguage] = useState(detail.language ?? "");
  const [tags, setTags] = useState(detail.tags.join(", "));
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const canSave = title.trim().length > 0 && !pending;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);

    const result = await updateItemAction(detail.id, {
      title,
      description,
      // Only send the fields this type actually edits, so a stale value can't
      // ride along on a type that doesn't show the input.
      content: editFields.includes("content") ? content : detail.content,
      url: editFields.includes("url") ? url : detail.url,
      language: editFields.includes("language") ? language : detail.language,
      tags: parseTags(tags),
    });

    if (!result.success || !result.data) {
      const message = result.error ?? "Something went wrong. Please try again.";
      // Both: the toast is what the user notices, the inline copy is what stays
      // on screen next to the field they have to fix.
      setError(message);
      toast.error(message);
      setPending(false);
      return;
    }

    setPending(false);
    onSaved(result.data);
    toast.success("Item updated.");
    // The card behind the drawer still shows the old title/description until
    // the server components re-render.
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <SheetHeader className="gap-3 border-b border-border p-6 pr-14">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-accent">
            <Icon className={cn("size-5", iconColor)} />
          </div>
          <div className="min-w-0 flex-1">
            {/* typeName is the singular DB name ("snippet"); no need to
                de-pluralize the display label. */}
            <SheetTitle className="text-xl font-semibold">
              Edit {detail.typeName}
            </SheetTitle>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {/* Type is fixed for the life of an item — shown, not editable. */}
              <Badge variant="secondary">{label}</Badge>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" size="sm" disabled={!canSave}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            Save
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={onCancel}
            disabled={pending}
          >
            <X className="size-4" />
            Cancel
          </Button>
        </div>
      </SheetHeader>

      <div className="flex-1 space-y-5 overflow-y-auto p-6">
        <Field label="Title" htmlFor="item-title">
          <Input
            id="item-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Item title"
            maxLength={200}
            required
          />
        </Field>

        <Field label="Description" htmlFor="item-description">
          <Textarea
            id="item-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What is this for?"
            rows={2}
          />
        </Field>

        {editFields.includes("content") && (
          <Field label="Content" htmlFor="item-content">
            <Textarea
              id="item-content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Paste your content here"
              // A plain textarea for now; a code editor is a later feature.
              className="min-h-64 font-mono text-xs leading-relaxed"
              spellCheck={false}
            />
          </Field>
        )}

        {editFields.includes("url") && (
          <Field label="URL" htmlFor="item-url">
            <Input
              id="item-url"
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com"
            />
          </Field>
        )}

        {editFields.includes("language") && (
          <Field label="Language" htmlFor="item-language">
            <Input
              id="item-language"
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              placeholder="typescript"
              spellCheck={false}
            />
          </Field>
        )}

        <Field label="Tags" htmlFor="item-tags">
          <Input
            id="item-tags"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder="react, hooks, forms"
          />
          <p className="text-xs text-muted-foreground">
            Separate tags with commas.
          </p>
        </Field>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <p className="text-xs text-muted-foreground">
          Type, collections and dates are managed outside this form.
        </p>
      </div>
    </form>
  );
}
