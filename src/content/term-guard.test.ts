import { describe, expect, it } from "vitest";
import { site } from "./site";
import { BANNED_TERM_HASHES, findTerms, hashTerm, parseTermFile } from "./term-guard";

// Stand-in terms: the real ones are never written in the repo.
const latin = hashTerm("Zebrafin");
const thai = hashTerm("ม้าลาย");
const phrase = hashTerm("blue heron");

describe("term guard", () => {
  it("matches a Latin term as a whole token, in any case, inside slugs and camelCase", () => {
    expect(findTerms("<h1>ZEBRAFIN</h1>", [latin])).toEqual([latin]);
    expect(findTerms('href="/work/zebrafin-ai"', [latin])).toEqual([latin]);
    expect(findTerms("ZebrafinScene", [latin])).toEqual([latin]);
    expect(findTerms("zebrafins and zebra fin", [latin])).toEqual([]);
  });

  it("matches a Thai term anywhere inside a run of Thai text", () => {
    expect(findTerms("ผลงานแรกคือม้าลายผู้ช่วย", [thai])).toEqual([thai]);
    expect(findTerms("ม้าและลาย", [thai])).toEqual([]);
  });

  it("matches a multi-word private term as a token sequence", () => {
    const list = parseTermFile("# private\nBlue Heron\n\n");
    expect(list).toEqual([phrase]);
    expect(findTerms("a Blue  heron landed", list)).toEqual([phrase]);
    expect(findTerms("blue sky, grey heron", list)).toEqual([]);
  });

  it("finds none of the committed terms anywhere in the site content", () => {
    expect(findTerms(JSON.stringify(site), BANNED_TERM_HASHES)).toEqual([]);
  });
});
