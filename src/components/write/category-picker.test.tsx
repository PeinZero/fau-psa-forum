import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CategoryPicker, type CategoryOption } from "./category-picker";

const categories: CategoryOption[] = [
  { id: 1, slug: "housing", name: "Housing", description: "  Flats and Anmeldung  " },
  { id: 2, slug: "visa", name: "Visa", description: null },
  { id: 3, slug: "jobs", name: "Jobs", description: "   " },
  { id: 4, slug: "general", name: "General" },
];

function setup(props: Partial<Parameters<typeof CategoryPicker>[0]> = {}) {
  const onChange = vi.fn();
  render(<CategoryPicker name="categoryId" categories={categories} value="" onChange={onChange} {...props} />);
  return { onChange };
}

describe("CategoryPicker", () => {
  it("renders a radio per category labelled by its name", () => {
    setup();
    expect(screen.getAllByRole("radio")).toHaveLength(4);
    const housing = screen.getByRole("radio", { name: /Housing/ });
    expect(housing).toHaveAttribute("name", "categoryId");
    expect(housing).toHaveAttribute("value", "1");
  });

  it("shows a trimmed description and none when null, blank or missing", () => {
    setup();
    expect(screen.getByText("Flats and Anmeldung")).toBeInTheDocument();
    const labelOf = (name: string) => screen.getByRole("radio", { name }).closest("label")!;
    expect(labelOf("Visa").querySelectorAll("span span")).toHaveLength(1);
    expect(labelOf("Jobs").querySelectorAll("span span")).toHaveLength(1);
    expect(labelOf("General").querySelectorAll("span span")).toHaveLength(1);
  });

  it("checks the category whose id matches the string value", () => {
    setup({ value: "2" });
    expect(screen.getByRole("radio", { name: "Visa" })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Housing/ })).not.toBeChecked();
  });

  it("checks nothing for an empty value", () => {
    setup();
    screen.getAllByRole("radio").forEach((radio) => expect(radio).not.toBeChecked());
  });

  it("passes the id as a string to onChange", async () => {
    const { onChange } = setup();
    await userEvent.click(screen.getByRole("radio", { name: "Jobs" }));
    expect(onChange).toHaveBeenCalledWith("3");
  });

  it("requires a choice", () => {
    setup();
    screen.getAllByRole("radio").forEach((radio) => expect(radio).toBeRequired());
  });

  it("marks the fieldset invalid and described when invalid", () => {
    setup({ invalid: true, describedBy: "cat-err" });
    const group = screen.getByRole("group", { name: "Category" });
    expect(group).toHaveAttribute("aria-invalid", "true");
    expect(group).toHaveAttribute("aria-describedby", "cat-err");
  });

  it("is not marked invalid by default", () => {
    setup();
    expect(screen.getByRole("group", { name: "Category" })).not.toHaveAttribute("aria-invalid");
  });
});
