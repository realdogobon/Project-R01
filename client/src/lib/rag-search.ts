import Fuse from "fuse.js";

export interface ScanDocument {
  id: string;
  owner_id: string;
  title: string;
  content: string;
  tags?: string[];
  createdAt: any;
}

let ragIndex: Fuse<ScanDocument> | null = null;
let scanCache: ScanDocument[] = [];

export function deduplicateScans(scans: ScanDocument[]): ScanDocument[] {
  const seen = new Set<string>();
  return (scans || []).filter(s => {
    if (!s || !s.id) return false;
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });
}

function getLocalStorageScans(): ScanDocument[] {
  try {
    const stored = localStorage.getItem("ais_scanned_documents");
    const parsed = stored ? JSON.parse(stored) : [];
    return deduplicateScans(parsed);
  } catch (err) {
    console.error("[RAG Engine] Failed to parse localStorage scans:", err);
    return [];
  }
}

function setLocalStorageScans(scans: ScanDocument[]) {
  try {
    const dedupedScans = deduplicateScans(scans);
    localStorage.setItem("ais_scanned_documents", JSON.stringify(dedupedScans));
  } catch (err) {
    console.error("[RAG Engine] Failed to write localStorage scans:", err);
  }
}

export async function syncRagIndex() {
  const localScans = getLocalStorageScans();
  scanCache = deduplicateScans(localScans);

  ragIndex = new Fuse(scanCache, {
    keys: [
      { name: "title", weight: 2 },
      { name: "content", weight: 1 },
      { name: "tags", weight: 1.5 }
    ],
    includeScore: true,
    threshold: 0.3,
    ignoreLocation: true
  });

  console.log(`[RAG Engine] Synchronized ${scanCache.length} documents.`);
}

function safeRandomUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function ingestDocument(title: string, content: string, tags: string[] = []) {
  const newId = safeRandomUUID();
  const ownerId = localStorage.getItem("typing_suite_current_uid") || "offline_user";

  const scanData: ScanDocument = {
    id: newId,
    owner_id: ownerId,
    title,
    content,
    tags,
    createdAt: new Date().toISOString()
  };

  const currentLocal = getLocalStorageScans();
  currentLocal.unshift(scanData);
  setLocalStorageScans(currentLocal);

  scanCache = deduplicateScans([scanData, ...scanCache]);
  if (ragIndex) {
    ragIndex.add(scanData);
  } else {
    await syncRagIndex();
  }

  return scanData;
}

export async function restoreScan(scanData: ScanDocument) {
  const currentLocal = getLocalStorageScans();
  if (!currentLocal.some(d => d.id === scanData.id)) {
    currentLocal.unshift(scanData);
    setLocalStorageScans(currentLocal);
  }
  await syncRagIndex();
}

export async function deleteScan(id: string) {
  const currentLocal = getLocalStorageScans();
  const updated = currentLocal.filter(d => d.id !== id);
  setLocalStorageScans(updated);
  await syncRagIndex();
}

export async function updateDocument(id: string, title: string, content: string) {
  const currentLocal = getLocalStorageScans();
  const index = currentLocal.findIndex(d => d.id === id);
  if (index !== -1) {
    currentLocal[index].title = title;
    currentLocal[index].content = content;
    setLocalStorageScans(currentLocal);
  }
  await syncRagIndex();
}

export function searchIntelligence(query: string): ScanDocument[] {
  if (!ragIndex) return [];
  const results = ragIndex.search(query);
  return results.map(r => r.item);
}

export function getAllScans(): ScanDocument[] {
  return scanCache;
}
