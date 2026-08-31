export function merge<T extends Record<string, any>>(a: T, b: Partial<T>): T {
  return [a, b as T].reduce((r, o) => Object
      .entries(o)
      .reduce((q, [k, v]) => ({
        ...q,
        [k]: v && typeof v === 'object' && v !== null && !Array.isArray(v) ? merge(q[k] || {}, v) : v
      }), r as Record<string, any>),
    {}) as T;
}

export function getSelectedPropertiesFromObject(settings: Record<string, any>): string[] {
  const selectedProperties: string[] = [];

  function formatKey(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .toLowerCase()
      .trim()
      .replace(/^\w/, (c) => c.toUpperCase());
  }

  function traverse(obj: any) {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];

        if (typeof value === 'boolean' && value) {
          selectedProperties.push(formatKey(key));
        } else if (typeof value === 'number' && value > 0) {
          selectedProperties.push(formatKey(key));
        } else if (typeof value === 'object' && value !== null && key !== 'resultSettings') {
          traverse(value);
        }
      }
    }
  }

  traverse(settings);
  return selectedProperties;
}

export const safeLoad = (key: string): any => {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "{}") ?? {};
  } catch (e) {
    return {};
  }
}

export function countWords(str: string): number {
  return str.trim().split(/\s+/).length;
}

