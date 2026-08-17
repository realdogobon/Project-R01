export type LineEnding = "crlf" | "lf" | "cr";
export type TextEncoding = "utf-8" | "utf-8-bom" | "utf-16le" | "utf-16be";
export type IndentMode = "tabs" | "spaces";

export type TabFormat = {
  lineEnding: LineEnding;
  encoding: TextEncoding;
  indentMode: IndentMode;
  tabSize: 2 | 4 | 8;
};

export type EditorSelectionStatus = {
  text: string;
  anchor: number | null;
  focus: number | null;
};

export const DEFAULT_TAB_FORMAT: TabFormat = {
  lineEnding: "crlf",
  encoding: "utf-8",
  indentMode: "spaces",
  tabSize: 4,
};

const lineEndingPattern = /\r\n|\r|\n/g;

export function normalizeTabFormat(value?: Partial<TabFormat> | null): TabFormat {
  const lineEnding = value?.lineEnding;
  const encoding = value?.encoding;
  const indentMode = value?.indentMode;
  const tabSize = value?.tabSize;
  return {
    lineEnding: lineEnding === "lf" || lineEnding === "cr" || lineEnding === "crlf" ? lineEnding : DEFAULT_TAB_FORMAT.lineEnding,
    encoding: encoding === "utf-8-bom" || encoding === "utf-16le" || encoding === "utf-16be" || encoding === "utf-8" ? encoding : DEFAULT_TAB_FORMAT.encoding,
    indentMode: indentMode === "tabs" || indentMode === "spaces" ? indentMode : DEFAULT_TAB_FORMAT.indentMode,
    tabSize: tabSize === 2 || tabSize === 8 || tabSize === 4 ? tabSize : DEFAULT_TAB_FORMAT.tabSize,
  };
}

export function lineEndingLabel(lineEnding: LineEnding): string {
  if (lineEnding === "lf") return "Unix (LF)";
  if (lineEnding === "cr") return "Mac (CR)";
  return "Windows (CRLF)";
}

export function encodingLabel(encoding: TextEncoding): string {
  if (encoding === "utf-8-bom") return "UTF-8 with BOM";
  if (encoding === "utf-16le") return "UTF-16 LE";
  if (encoding === "utf-16be") return "UTF-16 BE";
  return "UTF-8";
}

export function detectLineEnding(text: string): LineEnding {
  if (text.includes("\r\n")) return "crlf";
  if (text.includes("\n")) return "lf";
  if (text.includes("\r")) return "cr";
  return DEFAULT_TAB_FORMAT.lineEnding;
}

export function normalizeLineEndings(text: string, lineEnding: LineEnding): string {
  const replacement = lineEnding === "crlf" ? "\r\n" : lineEnding === "cr" ? "\r" : "\n";
  return text.replace(lineEndingPattern, replacement);
}

export function getLineColumn(text: string, offset: number | null): { line: number; column: number } {
  const safeOffset = Math.max(0, Math.min(offset ?? 0, text.length));
  const before = text.slice(0, safeOffset);
  const breaks = before.match(lineEndingPattern) ?? [];
  const finalBreakIndex = Math.max(before.lastIndexOf("\n"), before.lastIndexOf("\r"));
  return {
    line: breaks.length + 1,
    column: safeOffset - finalBreakIndex,
  };
}

export function getSelectionRange(status: EditorSelectionStatus): { start: number; end: number; count: number } | null {
  if (status.anchor === null || status.focus === null) return null;
  const start = Math.max(0, Math.min(status.anchor, status.focus, status.text.length));
  const end = Math.max(start, Math.min(Math.max(status.anchor, status.focus), status.text.length));
  return { start, end, count: end - start };
}

export function getOffsetForLineColumn(text: string, requestedLine: number, requestedColumn: number): number {
  const line = Math.max(1, Math.floor(requestedLine) || 1);
  const column = Math.max(1, Math.floor(requestedColumn) || 1);
  let currentLine = 1;
  let index = 0;

  while (currentLine < line && index < text.length) {
    const char = text[index];
    if (char === "\r" && text[index + 1] === "\n") index += 2;
    else if (char === "\r" || char === "\n") index += 1;
    else {
      index += 1;
      continue;
    }
    currentLine += 1;
  }

  const lineEnd = (() => {
    const cr = text.indexOf("\r", index);
    const lf = text.indexOf("\n", index);
    if (cr === -1) return lf === -1 ? text.length : lf;
    if (lf === -1) return cr;
    return Math.min(cr, lf);
  })();
  return Math.min(index + column - 1, lineEnd);
}

function utf16Bytes(text: string, littleEndian: boolean): Uint8Array {
  const bytes = new Uint8Array(text.length * 2);
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    if (littleEndian) {
      bytes[index * 2] = code & 0xff;
      bytes[index * 2 + 1] = code >> 8;
    } else {
      bytes[index * 2] = code >> 8;
      bytes[index * 2 + 1] = code & 0xff;
    }
  }
  return bytes;
}

export function encodeText(text: string, format: TabFormat): Uint8Array {
  const normalized = normalizeLineEndings(text, format.lineEnding);
  if (format.encoding === "utf-16le") {
    const bytes = utf16Bytes(normalized, true);
    return new Uint8Array([0xff, 0xfe, ...bytes]);
  }
  if (format.encoding === "utf-16be") {
    const bytes = utf16Bytes(normalized, false);
    return new Uint8Array([0xfe, 0xff, ...bytes]);
  }
  const bytes = new TextEncoder().encode(normalized);
  return format.encoding === "utf-8-bom" ? new Uint8Array([0xef, 0xbb, 0xbf, ...bytes]) : bytes;
}

export function createFormattedTextBlob(text: string, format: TabFormat): Blob {
  const encoded = encodeText(text, format);
  const ownedBytes = new Uint8Array(encoded.length);
  ownedBytes.set(encoded);
  return new Blob([ownedBytes.buffer], { type: "text/plain" });
}

export async function readFormattedTextFile(file: File): Promise<{ text: string; format: TabFormat }> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const startsWith = (...signature: number[]) => signature.every((value, index) => bytes[index] === value);

  if (startsWith(0xff, 0xfe)) {
    return { text: new TextDecoder("utf-16le").decode(bytes.slice(2)), format: { ...DEFAULT_TAB_FORMAT, encoding: "utf-16le", lineEnding: detectLineEnding(new TextDecoder("utf-16le").decode(bytes.slice(2))) } };
  }
  if (startsWith(0xfe, 0xff)) {
    return { text: new TextDecoder("utf-16be").decode(bytes.slice(2)), format: { ...DEFAULT_TAB_FORMAT, encoding: "utf-16be", lineEnding: detectLineEnding(new TextDecoder("utf-16be").decode(bytes.slice(2))) } };
  }
  const hasUtf8Bom = startsWith(0xef, 0xbb, 0xbf);
  const text = new TextDecoder("utf-8").decode(hasUtf8Bom ? bytes.slice(3) : bytes);
  return { text, format: { ...DEFAULT_TAB_FORMAT, encoding: hasUtf8Bom ? "utf-8-bom" : "utf-8", lineEnding: detectLineEnding(text) } };
}
