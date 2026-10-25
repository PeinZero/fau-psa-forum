import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import ts from "typescript";

type Found = { file: string; line: number; text: string };

const SRC = fileURLToPath(new URL("../src", import.meta.url));

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

/** String literals and JSX text only: comments, import specifiers and class names are not on screen. */
function userFacingStrings(file: string): Found[] {
  const code = readFileSync(file, "utf8");
  const tree = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found: Found[] = [];
  const add = (node: ts.Node, text: string) => {
    if (!text.trim()) return;
    const line = tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1;
    found.push({ file: relative(SRC, file), line, text });
  };
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) return;
    if (ts.isJsxAttribute(node) && node.name.getText(tree) === "className") return;
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) add(node, node.text);
    else if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) add(node, node.text);
    else if (ts.isJsxText(node)) add(node, node.text);
    ts.forEachChild(node, visit);
  };
  visit(tree);
  return found;
}

const strings = sourceFiles(SRC).flatMap(userFacingStrings);

const where = (f: Found) => `${f.file}:${f.line} "${f.text}"`;
const offenders = (test: (text: string) => boolean) => strings.filter((s) => test(s.text)).map(where);

describe("content rules", () => {
  it("finds the film's text to scan", () => {
    assert.ok(strings.length > 100, `only ${strings.length} strings`);
    assert.ok(strings.some((s) => s.text.includes("Even if you can’t spell Anmeldung.")));
  });

  it("writes Nürnberg only as Erlangen-Nürnberg", () => {
    const bare = offenders((t) => /Nürnberg/.test(t.replaceAll("Erlangen-Nürnberg", "")));
    assert.deepEqual(bare, []);
  });

  it("never transliterates Nürnberg", () => {
    // Link targets such as nuernberg.de are real addresses, not copy.
    const noUrls = (t: string) => t.replace(/https?:\/\/\S+/g, "");
    assert.deepEqual(offenders((t) => /Nuernberg|Nurnberg/i.test(noUrls(t))), []);
  });

  it("spells the forum name PSA FAU Community Forum", () => {
    const wrong = offenders((t) => /community forum/i.test(t.replaceAll("PSA FAU Community Forum", "")));
    assert.deepEqual(wrong, []);
  });

  it("has no placeholder text", () => {
    assert.deepEqual(offenders((t) => /lorem|ipsum/i.test(t)), []);
  });

  it("shows no real brands", () => {
    assert.deepEqual(offenders((t) => /\b(WhatsApp|iPhone|Apple|Google|Android)\b/.test(t)), []);
  });

  it("shows no moderation or legal UI the brief excludes", () => {
    assert.deepEqual(offenders((t) => /\b(Report|Mute|Ban|Privacy|Impressum)\b/.test(t)), []);
  });
});
