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

describe("Markdown sizes", () => {
  it("renders comments at body size by default", () => {
    const { container } = render(<Markdown>{"text"}</Markdown>);
    expect(container.firstChild).toHaveClass("text-body");
    expect(container.firstChild).not.toHaveClass("text-reading");
  });

  it("renders a thread's own post at the larger reading size", () => {
    const { container } = render(<Markdown size="reading">{"## Where to look\n\ntext"}</Markdown>);
    expect(container.firstChild).toHaveClass("text-reading");
    expect(container.firstChild).not.toHaveClass("text-body");
    // Authors' headings never compete with the page title.
    expect(screen.getByRole("heading", { level: 3, name: "Where to look" })).toBeInTheDocument();
  });
});

describe("Markdown images", () => {
  it("shows an image's alt text instead of loading it", () => {
    const { container } = render(<Markdown>{"Map: ![Rathaus entrance on the ground floor](https://example.com/rathaus.jpg)"}</Markdown>);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("[Image: Rathaus entrance on the ground floor]")).toBeInTheDocument();
  });

  it("drops an image without alt text entirely", () => {
    const { container } = render(<Markdown>{"before ![](https://example.com/tracker.gif) after"}</Markdown>);
    expect(container.querySelector("img")).toBeNull();
    expect(container).not.toHaveTextContent("Image");
    expect(container).toHaveTextContent("before after");
  });

  it("keeps a linked image's alt text inside the link", () => {
    render(<Markdown>{"[![Opening hours](https://example.com/hours.png)](https://example.com/hours)"}</Markdown>);
    expect(screen.getByRole("link", { name: "[Image: Opening hours]" })).toHaveAttribute("href", "https://example.com/hours");
  });
});
