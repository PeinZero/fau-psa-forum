import { describe, expect, it } from "vitest";

import { carriesFiles, isImageFile, pastedImages } from "./files";

const png = new File(["p"], "image.png", { type: "image/png" });
const pdf = new File(["%PDF"], "lease.pdf", { type: "application/pdf" });
const clipboard = (files: File[], text = "") => ({ files, getData: (format: string) => (format === "text/plain" ? text : "") });

describe("isImageFile", () => {
  it("accepts any image type", () => {
    expect(isImageFile(new File(["x"], "a.jpg", { type: "image/jpeg" }))).toBe(true);
    expect(isImageFile(png)).toBe(true);
  });

  it("accepts iPhone photos that arrive without a type", () => {
    expect(isImageFile(new File(["x"], "IMG_0042.HEIC"))).toBe(true);
    expect(isImageFile(new File(["x"], "scan.heif"))).toBe(true);
  });

  it("rejects documents and untyped files", () => {
    expect(isImageFile(pdf)).toBe(false);
    expect(isImageFile(new File(["x"], "notes.txt"))).toBe(false);
  });
});

describe("pastedImages", () => {
  const textarea = document.createElement("textarea");
  const input = document.createElement("input");
  const button = document.createElement("button");

  it("returns a pasted screenshot, also inside a text field", () => {
    expect(pastedImages(clipboard([png]), textarea)).toEqual([png]);
    expect(pastedImages(clipboard([png]), input)).toEqual([png]);
  });

  it("leaves plain text pastes alone", () => {
    expect(pastedImages(clipboard([], "Anmeldung"), textarea)).toEqual([]);
  });

  it("lets the text win when a spreadsheet adds a picture of it to the clipboard", () => {
    expect(pastedImages(clipboard([png], "Miete\t450"), textarea)).toEqual([]);
    expect(pastedImages(clipboard([png], "Miete\t450"), input)).toEqual([]);
  });

  it("takes the picture when there is no text field to paste the text into", () => {
    expect(pastedImages(clipboard([png], "Miete\t450"), button)).toEqual([png]);
  });

  it("ignores whitespace-only text next to an image", () => {
    expect(pastedImages(clipboard([png], " \n"), textarea)).toEqual([png]);
  });

  it("returns nothing for pasted files that aren't images", () => {
    expect(pastedImages(clipboard([pdf]), button)).toEqual([]);
    expect(pastedImages(clipboard([pdf, png]), button)).toEqual([png]);
  });
});

describe("carriesFiles", () => {
  it("spots file drags and leaves text drags alone", () => {
    expect(carriesFiles({ types: ["Files"] })).toBe(true);
    expect(carriesFiles({ types: ["text/plain", "text/html"] })).toBe(false);
    expect(carriesFiles(null)).toBe(false);
  });
});
