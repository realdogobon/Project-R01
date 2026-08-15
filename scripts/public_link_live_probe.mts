import { importPublicDocument } from "../server/publicLinkImport";

const url = process.argv[2];
if (!url) {
  throw new Error("Usage: tsx scripts/public_link_live_probe.mts <url>");
}

const result = await importPublicDocument(url);
console.log(JSON.stringify(result, null, 2));
