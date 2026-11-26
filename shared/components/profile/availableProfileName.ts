/** The name, or the name with a suffix such as " (2)" when a profile already has it. At most 50 characters with a suffix. */
export function availableProfileName(baseName: string, names: string[]): string {
  let name = baseName;
  let suffix = 2;
  // __proto__ cannot be stored as a profile key by the existing storage helper.
  while (names.includes(name) || name === "__proto__") {
    const ending = ` (${suffix++})`;
    name = Array.from(baseName).slice(0, 50 - ending.length).join("") + ending;
  }
  return name;
}
