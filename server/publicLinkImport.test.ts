import { describe, expect, it } from "vitest";
import { normalizePublicDocumentUrl, resolveImportedContentType } from "./publicLinkImport";

describe("normalizePublicDocumentUrl", () => {
  it("uses Google Docs' legitimate public PDF export route", () => {
    expect(normalizePublicDocumentUrl("https://docs.google.com/document/d/abc123/edit?pli=1").toString())
      .toBe("https://docs.google.com/document/d/abc123/export?format=pdf");
  });

  it("uses Google Drive's legitimate download route for file views", () => {
    expect(normalizePublicDocumentUrl("https://drive.google.com/file/d/abc123/edit").toString())
      .toBe("https://drive.google.com/uc?export=download&id=abc123");
  });

  it("preserves a direct public document URL", () => {
    expect(normalizePublicDocumentUrl("https://example.org/files/sample.pdf").toString())
      .toBe("https://example.org/files/sample.pdf");
  });

  it("rejects a non-web URL", () => {
    expect(() => normalizePublicDocumentUrl("file:///etc/passwd")).toThrow("invalid-url");
  });
});

describe("resolveImportedContentType", () => {
  it("recognizes a legitimate Google Drive binary PDF by its file signature", () => {
    expect(resolveImportedContentType("application/octet-stream", Buffer.from("%PDF-1.7\n"))).toBe("application/pdf");
  });

  it("does not trust a generic binary response without a supported signature", () => {
    expect(resolveImportedContentType("application/octet-stream", Buffer.from("not a document"))).toBe("application/octet-stream");
  });
});
