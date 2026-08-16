import dns from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import net from "node:net";

export const MAX_PUBLIC_VISUAL_BYTES = 50_000_000;
export const MAX_PUBLIC_TEXT_BYTES = 2_000_000;
const MAX_REDIRECTS = 4;
const REQUEST_TIMEOUT_MS = 15_000;

type ImportFailureKind = "invalid" | "blocked" | "unavailable" | "unsupported" | "oversize";

export type PublicLinkImportResult =
  | {
      ok: true;
      fileName: string;
      contentType: string;
      size: number;
      base64: string;
      sourceUrl: string;
    }
  | {
      ok: false;
      kind: ImportFailureKind;
      message: string;
    };

type RawResponse = {
  statusCode: number;
  headers: http.IncomingHttpHeaders;
  body: Buffer;
  finalUrl: URL;
};

const CONTENT_TYPE_EXTENSIONS: Record<string, string> = {
  "application/pdf": ".pdf",
  "text/markdown": ".md",
  "text/html": ".html",
  "text/plain": ".txt",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const TEXT_EXTENSIONS = new Set(["txt", "md", "markdown", "html", "htm", "csv", "xml", "json", "yaml", "yml"]);

function isPrivateIp(address: string): boolean {
  if (net.isIP(address) === 4) {
    const octets = address.split(".").map(Number);
    const [a, b] = octets;
    return a === 0 || a === 10 || a === 127 || a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31 || a === 192 && b === 168 || a === 100 && b >= 64 && b <= 127;
  }

  const normalized = address.toLowerCase();
  return normalized === "::1" || normalized.startsWith("fe80:") || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("::ffff:127.") || normalized.startsWith("::ffff:10.") || normalized.startsWith("::ffff:192.168.") || normalized.startsWith("::ffff:169.254.");
}

async function resolveSafeAddress(hostname: string): Promise<{ address: string; family: 4 | 6 }> {
  const normalized = hostname.trim().toLowerCase();
  if (!normalized || normalized === "localhost" || normalized.endsWith(".localhost") || normalized.endsWith(".local")) {
    throw new Error("blocked-host");
  }

  const records = net.isIP(normalized)
    ? [{ address: normalized, family: net.isIP(normalized) as 4 | 6 }]
    : await dns.lookup(normalized, { all: true, verbatim: true });

  if (!records.length || records.some((record) => isPrivateIp(record.address))) {
    throw new Error("blocked-host");
  }

  const record = records[0];
  return { address: record.address, family: record.family as 4 | 6 };
}

export function normalizePublicDocumentUrl(rawUrl: string): URL {
  const source = new URL(rawUrl.trim());
  if (source.protocol !== "https:" && source.protocol !== "http:") throw new Error("invalid-url");

  const host = source.hostname.toLowerCase();
  const docsMatch = source.pathname.match(/^\/document\/d\/([^/]+)/);
  const driveFileMatch = source.pathname.match(/^\/file\/d\/([^/]+)/);
  const queryId = source.searchParams.get("id");

  if (host === "docs.google.com" && docsMatch) {
    return new URL(`https://docs.google.com/document/d/${docsMatch[1]}/export?format=pdf`);
  }

  if ((host === "docs.google.com" || host === "drive.google.com") && (driveFileMatch || queryId)) {
    const id = driveFileMatch?.[1] || queryId!;
    return new URL(`https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`);
  }

  return source;
}

function isTextDocument(url: URL, contentType: string): boolean {
  const extension = url.pathname.split(".").at(-1)?.toLowerCase() || "";
  return TEXT_EXTENSIONS.has(extension) || contentType.startsWith("text/") || contentType === "application/json" || contentType === "application/xml";
}

function supportedContentType(contentType: string, url: URL): boolean {
  if (CONTENT_TYPE_EXTENSIONS[contentType]) return true;
  return isTextDocument(url, contentType);
}

export function resolveImportedContentType(headerValue: string, body: Buffer): string {
  const headerType = headerValue.split(";")[0].trim().toLowerCase() || "application/octet-stream";
  if (headerType !== "application/octet-stream" && headerType !== "application/binary") return headerType;

  // Google Drive legitimately returns downloaded shared files as generic binary
  // data. Trust only well-known, verified byte signatures—not the filename or
  // the generic header—before admitting such a response to the scanner.
  if (body.subarray(0, 5).toString("ascii") === "%PDF-") return "application/pdf";
  if (body.length >= 3 && body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff) return "image/jpeg";
  if (body.length >= 8 && body.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (body.length >= 12 && body.subarray(0, 4).toString("ascii") === "RIFF" && body.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";

  return headerType;
}

function suggestedFilename(response: RawResponse, contentType: string): string {
  const disposition = String(response.headers["content-disposition"] || "");
  const match = disposition.match(/filename\*?=(?:UTF-8''|"?)([^;"\r\n]+)/i);
  const fromHeader = match?.[1] ? decodeURIComponent(match[1].trim()) : "";
  const pathName = response.finalUrl.pathname.split("/").filter(Boolean).at(-1) || "linked-document";
  const name = fromHeader || pathName;
  return /\.[a-z0-9]{1,8}$/i.test(name) ? name.slice(0, 120) : `${name.slice(0, 110)}${CONTENT_TYPE_EXTENSIONS[contentType] || ".txt"}`;
}

async function requestPublicDocument(url: URL, redirects = 0): Promise<RawResponse> {
  if (redirects > MAX_REDIRECTS) throw new Error("too-many-redirects");
  const resolved = await resolveSafeAddress(url.hostname);
  const transport = url.protocol === "https:" ? https : http;

  return await new Promise<RawResponse>((resolve, reject) => {
    const request = transport.request(url, {
      method: "GET",
      headers: {
        Accept: "application/pdf,image/jpeg,image/png,image/webp,text/plain,text/markdown,text/html;q=0.9,*/*;q=0.1",
        "User-Agent": "RoyScript-Scanner-Link-Importer/1.0",
      },
      lookup: (_hostname, options, callback) => {
        // Node 22 may request `all: true` while choosing an address family. In
        // that case its client expects an array, not the legacy string result.
        // Always return the single address already vetted against private ranges.
        if (options.all) {
          (callback as unknown as (error: Error | null, addresses: Array<{ address: string; family: 4 | 6 }>) => void)(null, [resolved]);
          return;
        }
        callback(null, resolved.address, resolved.family);
      },
    }, (response) => {
      const statusCode = response.statusCode || 0;
      const location = response.headers.location;
      if (statusCode >= 300 && statusCode < 400 && location) {
        response.resume();
        const redirected = new URL(location, url);
        requestPublicDocument(redirected, redirects + 1).then(resolve, reject);
        return;
      }

      const headerLength = Number(response.headers["content-length"] || 0);
      if (Number.isFinite(headerLength) && headerLength > MAX_PUBLIC_VISUAL_BYTES) {
        response.destroy(new Error("oversize"));
        return;
      }

      const chunks: Buffer[] = [];
      let received = 0;
      response.on("data", (chunk: Buffer) => {
        received += chunk.length;
        if (received > MAX_PUBLIC_VISUAL_BYTES) {
          response.destroy(new Error("oversize"));
          return;
        }
        chunks.push(chunk);
      });
      response.on("end", () => resolve({ statusCode, headers: response.headers, body: Buffer.concat(chunks), finalUrl: url }));
      response.on("error", reject);
    });

    request.setTimeout(REQUEST_TIMEOUT_MS, () => request.destroy(new Error("timeout")));
    request.on("error", reject);
    request.end();
  });
}

function failure(kind: ImportFailureKind): PublicLinkImportResult {
  const messages: Record<ImportFailureKind, string> = {
    invalid: "The link format is not supported.",
    blocked: "This link cannot be imported from a private network location.",
    unavailable: "This link is not publicly available for scanner import.",
    unsupported: "This link did not provide a supported document.",
    oversize: "This linked document is larger than the scanner limit.",
  };
  return { ok: false, kind, message: messages[kind] };
}

export async function importPublicDocument(rawUrl: string): Promise<PublicLinkImportResult> {
  let normalized: URL;
  try {
    normalized = normalizePublicDocumentUrl(rawUrl);
  } catch {
    return failure("invalid");
  }

  try {
    const response = await requestPublicDocument(normalized);
    if (response.statusCode < 200 || response.statusCode >= 300) return failure("unavailable");

    const contentType = resolveImportedContentType(String(response.headers["content-type"] || "application/octet-stream"), response.body);
    if (!supportedContentType(contentType, response.finalUrl)) return failure("unsupported");

    const maximumBytes = isTextDocument(response.finalUrl, contentType) ? MAX_PUBLIC_TEXT_BYTES : MAX_PUBLIC_VISUAL_BYTES;
    if (response.body.byteLength > maximumBytes) return failure("oversize");

    return {
      ok: true,
      fileName: suggestedFilename(response, contentType),
      contentType,
      size: response.body.byteLength,
      base64: response.body.toString("base64"),
      sourceUrl: response.finalUrl.toString(),
    };
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "blocked-host") return failure("blocked");
    if (code === "oversize") return failure("oversize");
    return failure("unavailable");
  }
}
