import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { operator } from "@/lib/legal";
import ImpressumPage from "./impressum/page";
import PrivacyPage from "./privacy/page";

const original = { ...operator };
afterEach(() => Object.assign(operator, original));

const NAMES = "Mahad Khalid Tarar and Abdul Moeez";

describe.each([
  ["impressum", ImpressumPage],
  ["privacy", PrivacyPage],
])("%s page without a postal address", (_, Page) => {
  it("shows both names, the email and the address note", () => {
    render(<Page />);
    expect(screen.getAllByText(new RegExp(NAMES)).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: operator.email }).length).toBeGreaterThan(0);
    expect(screen.getByRole("note")).toHaveTextContent("postal address will be added soon");
    expect(document.body).not.toHaveTextContent("being finalised");
  });
});

describe("pages with a postal address", () => {
  it("shows the address instead of the note", () => {
    Object.assign(operator, { street: "Hauptstr. 1", postcode: "91054", city: "Erlangen" });
    render(<ImpressumPage />);
    expect(screen.queryByRole("note")).toBeNull();
    expect(screen.getAllByText(/Hauptstr\. 1/).length).toBeGreaterThan(0);
  });
});

describe("privacy page", () => {
  it("names joint controllers and the backup retention", () => {
    render(<PrivacyPage />);
    expect(screen.getByText(/joint controllers/)).toBeInTheDocument();
    expect(screen.getByText(/up to 4 weeks/)).toBeInTheDocument();
  });
});
