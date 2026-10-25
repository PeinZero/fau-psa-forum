import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { ChoiceGroup } from "./choice-group";

const options = [
  { value: "", label: "Any" },
  { value: "erlangen", label: "Erlangen" },
  { value: "nuremberg", label: "Nuremberg" },
];

function Controlled({ onChange = vi.fn() }: { onChange?: (value: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <ChoiceGroup
      name="city"
      legend="City"
      value={value}
      options={options}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
}

describe("ChoiceGroup", () => {
  it("is a group named by its legend", () => {
    render(<Controlled />);
    expect(screen.getByRole("group", { name: "City" })).toBeInTheDocument();
  });

  it("renders one radio per option sharing the field name", () => {
    render(<Controlled />);
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(3);
    radios.forEach((radio) => expect(radio).toHaveAttribute("name", "city"));
    expect(screen.getByRole("radio", { name: "Erlangen" })).toHaveAttribute("value", "erlangen");
  });

  it("checks the option matching the value, including the empty one", () => {
    render(<ChoiceGroup name="city" legend="City" value="nuremberg" options={options} onChange={vi.fn()} />);
    expect(screen.getByRole("radio", { name: "Nuremberg" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Any" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "Erlangen" })).not.toBeChecked();
  });

  it("checks the empty-valued option when the value is empty", () => {
    render(<ChoiceGroup name="city" legend="City" value="" options={options} onChange={vi.fn()} />);
    expect(screen.getByRole("radio", { name: "Any" })).toBeChecked();
  });

  it("calls onChange with the clicked option's value", async () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    await userEvent.click(screen.getByRole("radio", { name: "Erlangen" }));
    expect(onChange).toHaveBeenCalledWith("erlangen");
    expect(screen.getByRole("radio", { name: "Erlangen" })).toBeChecked();
  });

  it("moves the selection with the arrow keys", async () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    screen.getByRole("radio", { name: "Any" }).focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(onChange).toHaveBeenLastCalledWith("erlangen");
    expect(screen.getByRole("radio", { name: "Erlangen" })).toBeChecked();
  });

  it("renders the hint and wires invalid and describedBy to the fieldset", () => {
    render(
      <ChoiceGroup
        name="city"
        legend="City"
        hint={<p>Pick one</p>}
        value=""
        options={options}
        onChange={vi.fn()}
        invalid
        describedBy="err"
      />,
    );
    expect(screen.getByText("Pick one")).toBeInTheDocument();
    const group = screen.getByRole("group", { name: "City" });
    expect(group).toHaveAttribute("aria-invalid", "true");
    expect(group).toHaveAttribute("aria-describedby", "err");
  });

  it("omits aria-invalid when valid", () => {
    render(<Controlled />);
    expect(screen.getByRole("group")).not.toHaveAttribute("aria-invalid");
  });
});
