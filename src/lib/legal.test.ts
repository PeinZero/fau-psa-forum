import { afterEach, describe, expect, it } from "vitest";

import { completeOperator, formatLegalDate, joinNames, lastUpdated, operator } from "./legal";

const original = { ...operator };
afterEach(() => Object.assign(operator, original));

const fill = () => Object.assign(operator, { street: "Hauptstr. 1", postcode: "91054", city: "Erlangen" });

describe("operator", () => {
  it("names both founders", () => {
    expect(joinNames(operator.names)).toBe("Mahad Khalid Tarar and Abdul Moeez");
  });
});

describe("joinNames", () => {
  it("joins one, two and three names", () => {
    expect(joinNames(["A"])).toBe("A");
    expect(joinNames(["A", "B"])).toBe("A and B");
    expect(joinNames(["A", "B", "C"])).toBe("A, B and C");
  });
});

describe("completeOperator", () => {
  it("is null while any part of the address is missing", () => {
    expect(completeOperator()).toBeNull();
    for (const key of ["street", "postcode", "city"] as const) {
      fill();
      operator[key] = null;
      expect(completeOperator()).toBeNull();
    }
  });

  it("treats blank strings as missing", () => {
    fill();
    operator.street = "";
    expect(completeOperator()).toBeNull();
  });

  it("returns the full operator once the address is filled in", () => {
    fill();
    expect(completeOperator()).toMatchObject({ city: "Erlangen", country: "Germany", email: operator.email });
  });
});

describe("formatLegalDate", () => {
  it("renders a long British date in UTC", () => {
    expect(formatLegalDate("2026-10-24")).toBe("24 October 2026");
    expect(formatLegalDate("2026-03-01T23:59:59Z")).toBe("1 March 2026");
  });

  it("has a valid lastUpdated", () => {
    expect(lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(formatLegalDate(lastUpdated)).not.toBe("Invalid Date");
  });
});
