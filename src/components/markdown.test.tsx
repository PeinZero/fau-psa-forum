import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Markdown } from "./markdown";

const mention = (name: string) => screen.queryByRole("link", { name });

describe("Markdown mentions", () => {
  it("links a handle to the profile in lower case", () => {
    render(<Markdown>{"thanks @Bilal_K!"}</Markdown>);
    expect(mention("@Bilal_K")).toHaveAttribute("href", "/u/bilal_k");
  });

  it.each(["mail bilal@example.com", "@@double", "@ab", `@${"a".repeat(21)}`])("does not link %j", (text) => {
    render(<Markdown>{text}</Markdown>);
    // GFM autolinks the email as mailto:, but it must not become a profile link.
    for (const link of screen.queryAllByRole("link")) expect(link.getAttribute("href")).not.toMatch(/^\/u\//);
  });

  it("skips inline code, code blocks and existing links", () => {
    render(<Markdown>{"`@inline` and\n\n```\n@block\n```\n\n[@label](https://example.com)"}</Markdown>);
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByRole("link")).toHaveAttribute("href", "https://example.com");
  });

  it("opens ordinary links outside the forum without leaking the opener", () => {
    render(<Markdown>{"[site](https://example.com)"}</Markdown>);
    const link = screen.getByRole("link", { name: "site" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
  });

  it("never renders raw HTML", () => {
    const { container } = render(<Markdown>{"<script>alert(1)</script><b>bold</b>"}</Markdown>);
    expect(container.querySelector("script, b")).toBeNull();
  });
});
