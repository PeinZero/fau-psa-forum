import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { GuideSummary } from "@/components/guides/data";

import { ClosingCta } from "./closing-cta";
import { CommunityStripView } from "./community-strip";
import { Hero } from "./hero";
import { HeroEyebrowSkeleton, HeroEyebrowView } from "./hero-announcement";
import { HowItWorks } from "./how-it-works";
import { type PopularQuestion, PopularQuestionsView } from "./popular-questions";
import { StartHereView } from "./start-here";
import { TopicsView } from "./topics";

const guide = (overrides: Partial<GuideSummary> = {}): GuideSummary => ({
  id: 1,
  slug: "first-weeks-in-erlangen",
  title: "First weeks in Erlangen",
  summary: "Anmeldung, bank account and health insurance, in a sensible order.",
  isFeatured: true,
  stepCount: 8,
  doneCount: null,
  ...overrides,
});

const question = (overrides: Partial<PopularQuestion> = {}): PopularQuestion => ({
  id: 1,
  slug: "anmeldung-in-erlangen-ab12cd",
  title: "How do I register my address (Anmeldung) in Erlangen?",
  comment_count: 3,
  best_comment_id: null,
  category: { slug: "first-steps", name: "First steps" },
  ...overrides,
});

describe("Hero", () => {
  it("names the forum's audience and offers asking and searching", () => {
    render(<Hero />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Answers for Pakistani students in Erlangen & Nuremberg",
    );
    expect(screen.getByText(/Pakistan Student Association/)).toHaveTextContent("FAU Erlangen-Nürnberg");
    expect(screen.getByRole("link", { name: "Ask a question" })).toHaveAttribute("href", "/new");
    expect(screen.getByRole("link", { name: /Search threads/ })).toHaveAttribute("href", "/search");
  });

  it("lists the trust points", () => {
    render(<Hero />);
    const points = within(screen.getByRole("list", { name: "Why trust the answers" })).getAllByRole("listitem");
    expect(points.map((point) => point.textContent)).toEqual([
      "Moderated by students",
      "Verified guides",
      "Free and independent",
    ]);
  });
});

describe("StartHereView", () => {
  it("is left out until there is a guide", () => {
    const { container } = render(<StartHereView guides={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows at most two guides with their step count", () => {
    render(
      <StartHereView
        guides={[guide(), guide({ id: 2, slug: "first-weeks-in-nuremberg", title: "First weeks in Nuremberg" }), guide({ id: 3, slug: "jobs", title: "Finding a student job" })]}
      />,
    );
    const section = screen.getByRole("region", { name: "New in Erlangen or Nuremberg? Start here" });
    const cards = within(section).getAllByRole("listitem");
    expect(cards).toHaveLength(2);
    expect(within(cards[0]).getByRole("link")).toHaveAttribute("href", "/guides/first-weeks-in-erlangen");
    expect(cards[0]).toHaveTextContent("8 steps");
    expect(within(section).queryByText("Finding a student job")).toBeNull();
    expect(within(section).getByRole("link", { name: "All guides" })).toHaveAttribute("href", "/guides");
  });

  it("shows members their progress", () => {
    render(<StartHereView guides={[guide({ doneCount: 3 })]} />);
    expect(screen.getByText("3 of 8 steps done")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { hidden: true })).toHaveAttribute("aria-valuenow", "3");
  });

  it("marks a finished guide", () => {
    render(<StartHereView guides={[guide({ doneCount: 8 })]} />);
    expect(screen.getByText("All 8 steps done")).toBeInTheDocument();
  });
});

describe("TopicsView", () => {
  const topics = [
    { id: 1, slug: "rp-visa", name: "Residence permit & visa", description: "Appointments, documents, renewals.", threadCount: 12 },
    { id: 2, slug: "jobs", name: "Jobs", description: null, threadCount: 0 },
  ];

  it("links every category with its description", () => {
    render(<TopicsView topics={topics} />);
    expect(screen.getByRole("link", { name: /Residence permit & visa/ })).toHaveAttribute("href", "/c/rp-visa");
    expect(screen.getByRole("link", { name: /Jobs/ })).toHaveAttribute("href", "/c/jobs");
    expect(screen.getByText("Appointments, documents, renewals.")).toBeInTheDocument();
  });

  it("prints a thread count only for categories with threads", () => {
    render(<TopicsView topics={topics} />);
    expect(screen.getByText("12 threads")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Jobs/ })).not.toHaveTextContent(/thread/);
  });

  it("is left out without categories", () => {
    const { container } = render(<TopicsView topics={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("PopularQuestionsView", () => {
  it("lists up to five questions with category and status, plus a way to the full list", () => {
    const questions = Array.from({ length: 6 }, (_, i) => question({ id: i + 1, slug: `q-${i + 1}`, title: `Question ${i + 1}` }));
    questions[0] = { ...questions[0], best_comment_id: 99 };
    questions[1] = { ...questions[1], comment_count: 0, category: null };
    render(<PopularQuestionsView questions={questions} />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(5);
    expect(within(items[0]).getByRole("link")).toHaveAttribute("href", "/t/q-1");
    expect(items[0]).toHaveTextContent("Answered");
    expect(items[0]).toHaveTextContent("First steps");
    expect(items[1]).toHaveTextContent("Question 2");
    expect(items[1]).not.toHaveTextContent(/comment|Answered|·/);
    expect(items[2]).toHaveTextContent("3 comments");
    expect(screen.getByRole("link", { name: "Browse all questions" })).toHaveAttribute("href", "/browse");
  });

  it("invites the first question when there are none", () => {
    render(<PopularQuestionsView questions={[]} />);
    expect(screen.getByText("No questions yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ask the first one" })).toHaveAttribute("href", "/new");
  });
});

describe("HowItWorks", () => {
  it("numbers the three steps in order", () => {
    render(<HowItWorks />);
    const steps = screen.getAllByRole("listitem");
    expect(steps).toHaveLength(3);
    expect(steps[0]).toHaveTextContent("Step 1");
    expect(within(steps[2]).getByRole("heading")).toHaveTextContent("Moderators review & verify");
  });
});

describe("HeroEyebrowView", () => {
  const announcement = { href: "/announcements/7", title: "Welcome evening on 3 November", is_pinned: true };

  it("shows the PSA pill and no link when nothing was announced", () => {
    render(<HeroEyebrowView announcement={null} />);
    expect(screen.getByText(/Pakistan Student Association/)).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("links a pinned announcement with its tag, title and Read", () => {
    render(<HeroEyebrowView announcement={announcement} />);
    const link = screen.getByRole("link", { name: /Welcome evening on 3 November/ });
    expect(link).toHaveAttribute("href", "/announcements/7");
    expect(link).toHaveTextContent("Pinned");
    expect(link).toHaveTextContent("Read");
    expect(link).toHaveClass("min-h-11");
    expect(within(link).getByText("Welcome evening on 3 November")).toHaveClass("truncate");
  });

  it("tags a regular announcement as new", () => {
    render(<HeroEyebrowView announcement={{ ...announcement, is_pinned: false }} />);
    const link = screen.getByRole("link", { name: /Welcome evening/ });
    expect(link).toHaveTextContent("New");
    expect(link).not.toHaveTextContent("Pinned");
  });

  it("keeps the association's name as a quiet line outside the link", () => {
    render(<HeroEyebrowView announcement={announcement} />);
    const line = screen.getByText(/Pakistan Student Association/);
    expect(line).toHaveTextContent("FAU Erlangen-Nürnberg");
    expect(screen.getByRole("link")).not.toContainElement(line);
  });

  it("reserves the same height while loading", () => {
    const { container: loaded } = render(<HeroEyebrowView announcement={announcement} />);
    const { container: loading } = render(<HeroEyebrowSkeleton />);
    expect(loading.firstElementChild?.className).toContain("min-h-[4.5rem]");
    expect(loaded.firstElementChild?.className).toContain("min-h-[4.5rem]");
  });
});

describe("Hero eyebrow", () => {
  it("defaults to the PSA pill and accepts the announcement pill instead", () => {
    const { rerender } = render(<Hero />);
    expect(screen.getByText(/Pakistan Student Association/)).toBeInTheDocument();
    rerender(<Hero eyebrow={<HeroEyebrowView announcement={{ href: "/announcements/1", title: "Hello", is_pinned: false }} />} />);
    const heading = screen.getByRole("heading", { level: 1 });
    const link = screen.getByRole("link", { name: /Hello/ });
    expect(link.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe("CommunityStripView", () => {
  const moderators = Array.from({ length: 6 }, (_, i) => ({ id: `m${i}`, display_name: `Moderator ${i + 1}` }));

  it("shows the moderators' faces with the rest folded into a count", () => {
    render(<CommunityStripView moderators={moderators} total={9} signedIn={false} />);
    const team = screen.getByRole("link", { name: "Meet the 9 moderators" });
    expect(team).toHaveAttribute("href", "/contributors");
    expect(team).toHaveTextContent("+3");
    expect(screen.getAllByRole("link", { name: /Meet the/ })).toHaveLength(1);
  });

  it("says 'team' rather than counting a single moderator", () => {
    render(<CommunityStripView moderators={moderators.slice(0, 1)} total={1} signedIn={false} />);
    expect(screen.getByRole("link", { name: "Meet the team" })).toHaveAttribute("href", "/contributors");
  });

  it("leaves out the avatar row before anyone moderates", () => {
    render(<CommunityStripView moderators={[]} total={0} signedIn={false} />);
    const team = screen.getByRole("link", { name: "Meet the team" });
    expect(team).toHaveAttribute("href", "/contributors");
    expect(team).not.toHaveTextContent("+");
  });

  it("sends visitors through sign-in to apply and members straight to their account", () => {
    const { rerender } = render(<CommunityStripView moderators={moderators} total={6} signedIn={false} />);
    expect(screen.getByRole("link", { name: "Become a moderator" })).toHaveAttribute("href", "/login?next=%2Faccount");
    expect(screen.getByRole("link", { name: "Meet the 6 moderators" })).not.toHaveTextContent("+");
    rerender(<CommunityStripView moderators={moderators} total={6} signedIn />);
    expect(screen.getByRole("link", { name: "Become a moderator" })).toHaveAttribute("href", "/account");
  });
});

describe("ClosingCta", () => {
  it("ends on asking a question", () => {
    render(<ClosingCta />);
    expect(screen.getByRole("link", { name: "Ask a question" })).toHaveAttribute("href", "/new");
    expect(screen.getByRole("link", { name: "Browse questions" })).toHaveAttribute("href", "/browse");
  });
});
