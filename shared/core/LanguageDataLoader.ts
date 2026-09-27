/** Caches one lazy loader per language and retries after a failed request. */
export function createLanguageDataLoader<Language extends string, T>(
  load: (language: Language) => Promise<T>,
): (language: Language) => Promise<T> {
  const loaders = new Map<Language, () => Promise<T>>();
  return (language) => {
    let loader = loaders.get(language);
    if (!loader) {
      let value: Promise<T> | undefined;
      loader = () => {
        if (!value) {
          value = load(language).catch((error) => {
            value = undefined;
            throw error;
          });
        }
        return value;
      };
      loaders.set(language, loader);
    }
    return loader();
  };
}
