import type { DocumentOut, Health, RecentDoc, Voice } from "./types";

// All calls go through the Vite proxy (/api -> backend:8000).
const BASE = "/api";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(detail || `request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  async health(): Promise<Health> {
    return json(await fetch(`${BASE}/health`));
  },

  async voices(): Promise<Voice[]> {
    return json(await fetch(`${BASE}/voices`));
  },

  async recent(): Promise<RecentDoc[]> {
    return json(await fetch(`${BASE}/documents`));
  },

  async getDocument(id: number): Promise<DocumentOut> {
    return json(await fetch(`${BASE}/documents/${id}`));
  },

  async upload(file: File): Promise<DocumentOut> {
    const form = new FormData();
    form.append("file", file);
    return json(await fetch(`${BASE}/documents`, { method: "POST", body: form }));
  },

  async pasteText(title: string, text: string): Promise<DocumentOut> {
    return json(
      await fetch(`${BASE}/documents/text`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, text }),
      }),
    );
  },

  async savePosition(
    id: number,
    body: Partial<{
      current_segment: number;
      speed: number;
      voice_profile_id: string;
      finished: boolean;
    }>,
  ): Promise<void> {
    await fetch(`${BASE}/documents/${id}/position`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  },

  // URL for a paragraph's audio clip (generated on first request, then cached).
  audioUrl(docId: number, idx: number, voice: string): string {
    return `${BASE}/audio/${docId}/${idx}?voice=${encodeURIComponent(voice)}`;
  },

  async isCached(docId: number, idx: number, voice: string): Promise<boolean> {
    const res = await fetch(
      `${BASE}/audio/${docId}/${idx}/status?voice=${encodeURIComponent(voice)}`,
    );
    if (!res.ok) return false;
    const body = (await res.json()) as { cached: boolean };
    return body.cached;
  },
};
