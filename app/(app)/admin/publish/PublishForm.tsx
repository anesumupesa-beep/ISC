"use client";
import { useTransition } from "react";
import type { FormEvent } from "react";
import { publishUpdate } from "@/app/actions";
import { useShell } from "@/components/AppShell";
import { Icon } from "@/components/icons";
import { Action } from "@/components/ui";
import { logUpdatePublished } from "@/lib/admin/actions-publish";
import type { UpdateCategory } from "@/lib/types";

export function PublishForm() {
  const { report } = useShell();
  const [pending, startTransition] = useTransition();

  function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const category = String(data.get("category")) as UpdateCategory;
    const title = String(data.get("title"));
    startTransition(async () => {
      const result = await publishUpdate({ category, title, description: String(data.get("description")) });
      if (report(result, "Update published. It is now visible in the student Club Updates feed.")) {
        await logUpdatePublished(category, title);
        form.reset();
      }
    });
  }

  return (
    <form className="surface form-card publish-form" onSubmit={publish}>
      <h2>A useful update, clearly shared.</h2>
      <p>Published updates appear immediately on the student noticeboard.</p>
      <label>
        Update category
        <select name="category">
          <option>Official Announcements</option>
          <option>Weather & Holidays</option>
          <option>Events</option>
        </select>
      </label>
      <label>
        Title
        <input name="title" required maxLength={120} placeholder="A short, clear headline" />
      </label>
      <label>
        Update details
        <textarea name="description" required rows={5} maxLength={2000} placeholder="What do students need to know? Include dates, places and clear next steps." />
      </label>
      <label className="consent">
        <input type="checkbox" required />I have checked that this information is accurate and appropriate to publish.
      </label>
      <Action type="submit" variant="primary" disabled={pending}>
        Publish club update
        <Icon name="arrow" size={17} />
      </Action>
    </form>
  );
}
