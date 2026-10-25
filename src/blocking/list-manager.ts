export interface ListMeta {
  id: string;
  name: string;
  sourceUrl: string;
  ruleCount: number;
  convertedAt: string;
  error?: string;
}

let cachedMeta: ListMeta[] | null = null;

export async function getListMetadata(): Promise<ListMeta[]> {
  if (cachedMeta) return cachedMeta;
  try {
    const url = chrome.runtime.getURL('rules/metadata.json');
    const response = await fetch(url);
    cachedMeta = (await response.json()) as ListMeta[];
    return cachedMeta;
  } catch {
    return [];
  }
}
