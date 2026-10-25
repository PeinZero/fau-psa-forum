import { CircleCheck, Inbox, MessageSquare, PenLine } from "lucide-react";
import Link from "next/link";

import { CategoryGlyph } from "@/components/thread/category-icon";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { EmptyState } from "@/components/ui/empty-state";

import { CardArrow, LandingSection } from "./section";
import { POPULAR_LIMIT, popularStatus } from "./shape";

export type PopularQuestion = {
  id: number;
  slug: string;
  title: string;
  comment_count: number;
  best_comment_id: number | null;
  category: { slug: string; name: string } | null;
};

const title = "Popular questions";
const description = "What students are asking and answering right now.";
const link = { href: "/browse", label: "Browse all questions" };
const listFrame = "overflow-hidden rounded-xl border border-border divide-y divide-border";

export function PopularQuestionsView({ questions }: { questions: readonly PopularQuestion[] }) {
  return (
    <LandingSection id="popular" title={title} description={description} link={link}>
      {questions.length === 0 ? (
        <EmptyState
          icon={<Inbox />}
          title="No questions yet"
          action={
            <Link href="/new" className={buttonClasses({ variant: "secondary", size: "sm" })}>
              <PenLine strokeWidth={1.75} />
              Ask the first one
            </Link>
          }
        >
          Ask what you wish someone had told you; a moderator reviews every new thread.
        </EmptyState>
      ) : (
        <ol className={listFrame}>
          {questions.slice(0, POPULAR_LIMIT).map((question) => (
            <li key={question.id}>
              <QuestionRow question={question} />
            </li>
          ))}
        </ol>
      )}
    </LandingSection>
  );
}

function QuestionRow({ question }: { question: PopularQuestion }) {
  const status = popularStatus(question);
  return (
    <Link
      href={`/t/${question.slug}`}
      className="group flex items-center gap-4 px-4 py-4 transition-colors duration-150 ease-out hover:bg-surface-hover active:bg-surface-hover/70 focus-visible:-outline-offset-2 sm:px-5"
    >
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-body font-medium text-pretty break-words text-foreground">{question.title}</span>
        <span className="mt-1 flex min-w-0 items-center gap-1.5 text-meta text-muted">
          {question.category && (
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <CategoryGlyph slug={question.category.slug} className="size-3.5 text-subtle" />
              <span className="truncate">{question.category.name}</span>
            </span>
          )}
          {question.category && status && (
            <span aria-hidden className="text-subtle">
              ·
            </span>
          )}
          {status && (
            <span className={cn("inline-flex shrink-0 items-center gap-1 tabular-nums", status.answered && "font-medium text-accent")}>
              {status.answered ? (
                <CircleCheck aria-hidden strokeWidth={1.75} className="size-3.5" />
              ) : (
                <MessageSquare aria-hidden strokeWidth={1.75} className="size-3.5 text-subtle" />
              )}
              {status.label}
            </span>
          )}
        </span>
      </span>
      <CardArrow />
    </Link>
  );
}
