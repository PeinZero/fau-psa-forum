import { ChevronLeft, ChevronRight, ScrollText, Search } from "lucide-react";
import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";

import {
  berlinDayStart,
  describeLogEntry,
  isModAction,
  LOG_ACTION_GROUPS,
  type LogEntry,
  type LogPart,
} from "@/components/mod/log-format";
import { Button, buttonClasses } from "@/components/ui/button";
import { cardClasses } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Label, Select } from "@/components/ui/field";
import { stagger } from "@/components/ui/motion";
import { formatDate } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Moderation log" };

const PAGE_SIZE = 50;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const LOG_FIELDS = `id, action, reason, details, thread_id, comment_id, created_at,
  actor:profiles!moderation_log_actor_id_fkey(display_name, username),
  target:profiles!moderation_log_target_user_id_fkey(display_name, username),
  thread:threads!moderation_log_thread_id_fkey(slug, title)`;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const first = (value: string | string[] | undefined) => (typeof value === "string" ? value : "");

export default async function ModerationLogPage({ searchParams }: Props) {
  const params = await searchParams;
  const action = isModAction(first(params.action)) ? first(params.action) : "";
  const moderator = UUID.test(first(params.moderator)) ? first(params.moderator) : "";
  const fromStart = berlinDayStart(first(params.from));
  const toEnd = berlinDayStart(first(params.to), 1);
  const from = fromStart ? first(params.from) : "";
  const to = toEnd ? first(params.to) : "";
  const pageParam = Number.parseInt(first(params.page), 10);
  const page = Number.isInteger(pageParam) && pageParam >= 1 && pageParam <= 10_000 ? pageParam : 1;

  const supabase = await createClient();
  let query = supabase.from("moderation_log").select(LOG_FIELDS);
  if (action && isModAction(action)) query = query.eq("action", action);
  if (moderator) query = query.eq("actor_id", moderator);
  if (fromStart) query = query.gte("created_at", fromStart);
  if (toEnd) query = query.lt("created_at", toEnd);

  const offset = (page - 1) * PAGE_SIZE;
  const [{ data: rows, error }, { data: moderators }] = await Promise.all([
    // One extra row tells whether a next page exists.
    query.order("created_at", { ascending: false }).order("id", { ascending: false }).range(offset, offset + PAGE_SIZE),
    supabase.from("profiles").select("id, display_name").in("role", ["moderator", "superadmin"]).order("display_name"),
  ]);

  const filters = { action, moderator, from, to };
  const hasFilters = Boolean(action || moderator || from || to);
  const hrefFor = (target: number) => {
    const search = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
    if (target > 1) search.set("page", String(target));
    const qs = search.toString();
    return qs ? `/mod/log?${qs}` : "/mod/log";
  };

  const entries = rows?.slice(0, PAGE_SIZE) ?? [];
  const hasNext = (rows?.length ?? 0) > PAGE_SIZE;

  return (
    <div className="grid gap-5">
      <Form action="/mod/log" role="search" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="grid gap-1.5">
          <Label htmlFor="log-action">Action</Label>
          <Select id="log-action" name="action" defaultValue={action}>
            <option value="">All actions</option>
            {LOG_ACTION_GROUPS.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {Object.entries(group.actions).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="log-moderator">Moderator</Label>
          <Select id="log-moderator" name="moderator" defaultValue={moderator}>
            <option value="">All moderators</option>
            {moderators?.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.display_name}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="log-from">From</Label>
          <Input id="log-from" name="from" type="date" defaultValue={from} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="log-to">To</Label>
          <Input id="log-to" name="to" type="date" defaultValue={to} />
        </div>
        <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-4">
          <Button type="submit" variant="secondary">
            <Search aria-hidden strokeWidth={1.75} />
            Filter
          </Button>
          {hasFilters && (
            <Link href="/mod/log" className={buttonClasses({ variant: "ghost" })}>
              Clear filters
            </Link>
          )}
        </div>
      </Form>

      {error ? (
        <p role="alert" className="text-body text-danger">Could not load the log. Please reload.</p>
      ) : !entries.length ? (
        <EmptyState icon={<ScrollText />} title={page > 1 ? "No more entries" : "No log entries"}>
          {hasFilters || page > 1 ? "Nothing matches these filters." : "Moderator actions show up here."}
        </EmptyState>
      ) : (
        <div className={cardClasses({ padding: "none", className: "overflow-hidden" })}>
          <ul className="divide-y divide-border">
            {entries.map((row, index) => (
              <li key={row.id} style={stagger(index)} className="grid animate-fade-up gap-1 px-4 py-3">
                <p className="break-words text-small">
                  <Sentence parts={describeLogEntry(row as LogEntry)} />
                </p>
                {row.reason && <p className="break-words text-meta text-muted">Reason: {row.reason}</p>}
                <time dateTime={row.created_at} className="text-meta text-subtle">
                  {formatDate(row.created_at)}, {timeFormat.format(new Date(row.created_at))}
                </time>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(page > 1 || hasNext) && (
        <nav aria-label="Log pages" className="flex items-center justify-between gap-3">
          {page > 1 ? (
            <Link href={hrefFor(page - 1)} className={buttonClasses({ variant: "secondary", size: "sm" })}>
              <ChevronLeft aria-hidden strokeWidth={1.75} />
              Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-meta text-muted">Page {page}</span>
          {hasNext ? (
            <Link href={hrefFor(page + 1)} className={buttonClasses({ variant: "secondary", size: "sm" })}>
              Next
              <ChevronRight aria-hidden strokeWidth={1.75} />
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}

const timeFormat = new Intl.DateTimeFormat("en-GB", { timeStyle: "short", timeZone: "Europe/Berlin" });

function Sentence({ parts }: { parts: LogPart[] }) {
  return parts.map((part, index) => {
    if (typeof part === "string") return part;
    const text = part.quoted ? `“${part.text}”` : part.text;
    return part.href ? (
      <Link key={index} href={part.href} className="font-medium hover:underline">
        {text}
      </Link>
    ) : (
      <span key={index} className={part.quoted ? undefined : "font-medium"}>
        {text}
      </span>
    );
  });
}
