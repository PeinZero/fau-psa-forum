import { ArrowRight, ChevronRight, Megaphone, Pin } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { announcementHref, fetchAnnouncements } from "@/components/announcements/data";
import { Author } from "@/components/author";
import { ActionButton } from "@/components/mod/action-button";
import { moderateAnnouncement } from "@/components/mod/actions";
import { AnnouncementActionButton } from "@/components/mod/announcement-action-button";
import { AnnouncementForm } from "@/components/mod/announcement-form";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { stagger } from "@/components/ui/motion";
import { formatDate } from "@/lib/labels";

export const metadata: Metadata = { title: "Announcements" };

export default async function ModAnnouncementsPage() {
  const { announcements, error } = await fetchAnnouncements();

  return (
    <div className="grid gap-8">
      <section aria-labelledby="new-announcement">
        <Card>
          <h2 id="new-announcement" className="mb-4 text-heading font-semibold tracking-tight">
            New announcement
          </h2>
          <AnnouncementForm />
        </Card>
      </section>

      <section aria-labelledby="all-announcements" className="grid gap-3">
        <h2 id="all-announcements" className="text-heading font-semibold tracking-tight">
          All announcements
        </h2>
        {error ? (
          <p role="alert" className="text-body text-danger">
            Could not load announcements. Please reload.
          </p>
        ) : announcements.length === 0 ? (
          <EmptyState icon={<Megaphone />} title="No announcements yet">
            Post the first one above.
          </EmptyState>
        ) : (
          <ul className="grid gap-3">
            {announcements.map((announcement, index) => (
              <li key={announcement.id} id={`announcement-${announcement.id}`} style={stagger(index)} className="animate-fade-up scroll-mt-24">
                <Card padding="none">
                  <details className="group">
                    <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 rounded-xl px-4 py-2 hover:bg-surface-hover [&::-webkit-details-marker]:hidden">
                      <ChevronRight
                        aria-hidden
                        strokeWidth={1.75}
                        className="size-4 shrink-0 text-muted transition-transform duration-150 group-open:rotate-90"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-sm font-medium">{announcement.title}</span>
                          {announcement.is_pinned && (
                            <Badge variant="accent">
                              <Pin aria-hidden strokeWidth={1.75} />
                              Pinned
                            </Badge>
                          )}
                        </span>
                        <span className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 text-meta text-muted">
                          <Author profile={announcement.author} avatar={false} />
                          <span aria-hidden className="text-subtle">
                            ·
                          </span>
                          <time dateTime={announcement.created_at}>{formatDate(announcement.created_at)}</time>
                        </span>
                      </span>
                    </summary>
                    <div className="grid gap-4 border-t border-border p-4">
                      <AnnouncementForm announcement={announcement} />
                      <div className="flex flex-wrap items-start gap-2 border-t border-border pt-4">
                        <ActionButton
                          action={moderateAnnouncement}
                          fields={{ announcementId: announcement.id, op: announcement.is_pinned ? "unpin" : "pin" }}
                          label={announcement.is_pinned ? "Unpin" : "Pin"}
                          pendingLabel={announcement.is_pinned ? "Unpinning..." : "Pinning..."}
                        />
                        <Link
                          href={announcementHref(announcement.id)}
                          className={buttonClasses({ variant: "ghost", size: "sm" })}
                        >
                          View
                          <ArrowRight aria-hidden strokeWidth={1.75} />
                        </Link>
                        <div className="sm:ml-auto">
                          <AnnouncementActionButton
                            fields={{ announcementId: announcement.id, op: "delete" }}
                            label="Delete"
                            pendingLabel="Deleting..."
                            tone="danger"
                            confirm={`Delete "${announcement.title}"? Its notifications are removed too. This cannot be undone.`}
                          />
                        </div>
                      </div>
                    </div>
                  </details>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
