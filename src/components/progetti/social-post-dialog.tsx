"use client";

import { useActionState, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField } from "@/components/form-field";
import { POST_STATUS, SOCIAL_PLATFORM_LABEL } from "@/lib/labels";
import type { ActionResult } from "@/lib/action-result";
import type {
  PostStatus,
  SocialPlatform,
  SocialPost,
} from "@/generated/prisma/client";

/** Dialog di creazione/modifica di un post del piano editoriale. */
export function SocialPostDialog({
  action,
  post,
}: {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  post?: SocialPost;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    async (prev: ActionResult, formData: FormData) => {
      const result = await action(prev, formData);
      if (result.ok) {
        setOpen(false);
        toast.success(post ? "Post aggiornato." : "Post aggiunto al piano.");
      }
      return result;
    },
    { ok: false }
  );

  const scheduledValue = post?.scheduledDate
    ? new Date(
        post.scheduledDate.getTime() -
          post.scheduledDate.getTimezoneOffset() * 60_000
      )
        .toISOString()
        .slice(0, 16)
    : "";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {post ? (
          <Button variant="ghost" size="icon-sm" aria-label="Modifica post">
            <Pencil />
          </Button>
        ) : (
          <Button variant="outline" size="sm">
            <Plus data-icon="inline-start" /> Nuovo post
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{post ? "Modifica post" : "Nuovo post"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Piattaforma" name="platform" errors={state.fieldErrors}>
              <Select name="platform" defaultValue={post?.platform ?? "INSTAGRAM"}>
                <SelectTrigger id="platform" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(SOCIAL_PLATFORM_LABEL) as SocialPlatform[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      {SOCIAL_PLATFORM_LABEL[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Stato" name="status" errors={state.fieldErrors}>
              <Select name="status" defaultValue={post?.status ?? "IDEA"}>
                <SelectTrigger id="status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(POST_STATUS) as PostStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {POST_STATUS[s].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>
          <FormField label="Data programmata" name="scheduledDate" errors={state.fieldErrors}>
            <Input
              id="scheduledDate"
              name="scheduledDate"
              type="datetime-local"
              defaultValue={scheduledValue}
            />
          </FormField>
          <FormField label="Caption" name="caption" errors={state.fieldErrors}>
            <Textarea id="caption" name="caption" rows={3} defaultValue={post?.caption ?? ""} />
          </FormField>
          <FormField label="Hashtag" name="hashtags" errors={state.fieldErrors}>
            <Input
              id="hashtags"
              name="hashtags"
              placeholder="#brand #campagna"
              defaultValue={post?.hashtags ?? ""}
            />
          </FormField>
          <FormField label="Link creatività" name="contentUrl" errors={state.fieldErrors}>
            <Input
              id="contentUrl"
              name="contentUrl"
              placeholder="https://… (Drive, Figma…)"
              defaultValue={post?.contentUrl ?? ""}
            />
          </FormField>
          <FormField label="Note" name="notes" errors={state.fieldErrors}>
            <Textarea id="notes" name="notes" rows={2} defaultValue={post?.notes ?? ""} />
          </FormField>
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? "Salvataggio…" : "Salva"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
