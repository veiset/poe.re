interface ArrayDelta {
  $array: unknown[];
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export const createProfileDelta = (current: unknown, defaults: unknown): unknown => {
  if (JSON.stringify(current) === JSON.stringify(defaults)) return undefined;
  if (Array.isArray(current)) {
    if (Array.isArray(defaults) && defaults.length > 0 && current.every(isObject)) {
      return {$array: current.map((value, index) =>
        createProfileDelta(value, defaults[Math.min(index, defaults.length - 1)]) ?? {})} satisfies ArrayDelta;
    }
    return current;
  }
  if (isObject(current) && isObject(defaults)) {
    const result: Record<string, unknown> = {};
    Object.entries(current).forEach(([key, value]) => {
      const difference = createProfileDelta(value, defaults[key]);
      if (difference !== undefined) result[key] = difference;
    });
    return result;
  }
  return current;
};

export const hydrateProfileDelta = (difference: unknown, defaults: unknown): unknown => {
  if (isObject(difference) && Array.isArray(difference.$array)) {
    const defaultArray = Array.isArray(defaults) ? defaults : [];
    return difference.$array.map((value, index) =>
      hydrateProfileDelta(value, defaultArray[Math.min(index, Math.max(0, defaultArray.length - 1))]));
  }
  if (Array.isArray(difference)) return difference;
  if (isObject(difference)) {
    const result: Record<string, unknown> = isObject(defaults) ? {...defaults} : {};
    Object.entries(difference).forEach(([key, value]) => {
      if (key !== "__proto__" && key !== "constructor" && key !== "prototype") {
        result[key] = hydrateProfileDelta(value, result[key]);
      }
    });
    return result;
  }
  return difference;
};
