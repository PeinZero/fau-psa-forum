import Link from "next/link";

const sections = [
  { href: "/mod/threads", title: "Pending threads", text: "Approve or reject new threads." },
  { href: "/mod/edits", title: "Recent edits", text: "Changes to live threads in the last 7 days." },
  { href: "/mod/applications", title: "Applications", text: "Review moderator applications." },
  { href: "/mod/categories", title: "Categories", text: "Create and edit categories." },
];

export default function ModOverviewPage() {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {sections.map((section) => (
        <li key={section.href}>
          <Link href={section.href} className="block min-h-11 rounded-md border border-border p-4 hover:bg-border/40">
            <span className="font-medium">{section.title}</span>
            <span className="mt-1 block text-sm text-muted">{section.text}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
