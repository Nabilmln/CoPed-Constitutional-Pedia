import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  chunkConstitutionalText,
  normalizeConstitutionalText,
} from "./constitutional-chunker";

const SAMPLE_TEXT = `
UNDANG-UNDANG DASAR NEGARA REPUBLIK INDONESIA
TAHUN 1945
PEMBUKAAN
Bahwa sesungguhnya kemerdekaan itu ialah hak segala bangsa.
BAB I
BENTUK DAN KEDAULATAN
Pasal 1
(1)Negara Indonesia ialah Negara Kesatuan, yang berbentuk Republik.
(2) Kedaulatan berada di tangan rakyat.
www.peraturan.go.id
BAB II
MAJELIS PERMUSYAWARATAN RAKYAT
Pasal 2
Majelis Permusyawaratan Rakyat terdiri atas anggota yang dipilih.
`;

describe("constitutional chunker", () => {
  it("removes PDF footers and normalizes paragraph markers", () => {
    const lines = normalizeConstitutionalText(SAMPLE_TEXT);

    assert.equal(lines.includes("www.peraturan.go.id"), false);
    assert.ok(lines.includes("(1) Negara Indonesia ialah Negara Kesatuan, yang berbentuk Republik."));
  });

  it("preserves preamble, chapter, article, and paragraph metadata", () => {
    const chunks = chunkConstitutionalText(SAMPLE_TEXT);

    assert.equal(chunks.length, 4);
    assert.equal(chunks[0].metadata.section, "preamble");
    assert.equal(chunks[1].chapter, "I");
    assert.equal(chunks[1].chapterTitle, "BENTUK DAN KEDAULATAN");
    assert.equal(chunks[1].articleNumber, "1");
    assert.equal(chunks[1].paragraphNumber, "1");
    assert.equal(chunks[2].paragraphNumber, "2");
    assert.equal(chunks[3].articleNumber, "2");
    assert.equal(chunks[3].paragraphNumber, null);
  });

  it("creates stable sequential indexes and citation-aware content", () => {
    const chunks = chunkConstitutionalText(SAMPLE_TEXT);

    assert.deepEqual(
      chunks.map((chunk) => chunk.chunkIndex),
      [0, 1, 2, 3],
    );
    assert.match(chunks[1].content, /BAB I.*Pasal 1.*ayat \(1\)/);
  });

  it("splits oversized content without losing article metadata", () => {
    const text = `BAB III
KEKUASAAN PEMERINTAHAN NEGARA
Pasal 4
${"Presiden menjalankan pemerintahan menurut Undang-Undang Dasar. ".repeat(20)}`;
    const chunks = chunkConstitutionalText(text, "UUD1945.pdf", 220);

    assert.ok(chunks.length > 1);
    assert.ok(chunks.every((chunk) => chunk.articleNumber === "4"));
    assert.ok(chunks.every((chunk) => chunk.metadata.part));
  });

  it("repairs known UUD PDF extraction anomalies for articles 11 and 34", () => {
    const extractedOrder = `
BAB III
KEKUASAAN PEMERINTAHAN NEGARA
Pasal 6
(2) Presiden dan Wakil Presiden dipilih oleh Majelis Permusyawaratan Rakyat.
Presiden dengan persetujuan Dewan Perwakilan Rakyat menyatakan perang, membuat
perdamaian dan perjanjian dengan negara lain.
Pasal 11
Pasal 12
Presiden menyatakan keadaan bahaya.
BAB XIV
KESEJAHTERAAN SOSIAL
Pasal34
Fakir miskin dan anak-anak yang terlantar dipelihara oleh negara.
`;
    const chunks = chunkConstitutionalText(extractedOrder);
    const articleSix = chunks.find((chunk) => chunk.articleNumber === "6");
    const articleEleven = chunks.find(
      (chunk) => chunk.articleNumber === "11",
    );
    const articleThirtyFour = chunks.find(
      (chunk) => chunk.articleNumber === "34",
    );

    assert.ok(articleSix);
    assert.doesNotMatch(articleSix.content, /menyatakan perang/);
    assert.ok(articleEleven);
    assert.match(articleEleven.content, /menyatakan perang/);
    assert.ok(articleThirtyFour);
    assert.match(articleThirtyFour.content, /Fakir miskin/);
  });
});
