import type {ItemBase, LegacyItemRegex as ItemRegex} from "@poe/types/generated/item";

const basePath = "/generated";

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status} ${response.statusText}`);
  }
  return response.json() as T;
}

function lazy<T>(load: () => Promise<T>): () => Promise<T> {
  let value: Promise<T> | null = null;
  return () => {
    if (!value) {
      value = load().catch((error) => {
        value = null;
        throw error;
      });
    }
    return value;
  };
}

const itemBasetypes = lazy(() =>
  fetchJson<ItemBase[]>(`${basePath}/item/Generated.Basetypes.Item.min.json`),
);

const itemRegex = lazy(() =>
  fetchJson<ItemRegex[]>(`${basePath}/item/Generated.Item.min.json`),
);

export function loadItemBasetypes(): Promise<ItemBase[]> {
  return itemBasetypes();
}

export function loadItemRegex(): Promise<ItemRegex[]> {
  return itemRegex();
}
