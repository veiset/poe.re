import {useEffect, useMemo, useState} from "react";
import type {RepoeLanguageKey} from "@poe/utils/Languages";
import {isPoe2RegexFavorite} from "./favorites";
import type {Poe2FavoriteRecord, Poe2RegexFavoriteRecord} from "./settings";
import {renderPoe2Favorite} from "./favoriteLanguageRenderer";

type RenderedState = {language: RepoeLanguageKey; regexById: Map<string, string>};

export function useRenderedFavorites(favorites: Poe2FavoriteRecord[], language: RepoeLanguageKey): Poe2FavoriteRecord[] {
  const [rendered, setRendered] = useState<RenderedState>();
  const dependent = favorites.filter((favorite): favorite is Poe2RegexFavoriteRecord =>
    isPoe2RegexFavorite(favorite) && favorite.languageDependent);

  useEffect(() => {
    if (!dependent.length) { setRendered(undefined); return; }
    let cancelled = false;
    Promise.all(dependent.map(async (favorite) => {
      try { return [favorite.id, await renderPoe2Favorite(favorite, language)] as const; }
      catch { return [favorite.id, favorite.regex] as const; }
    })).then((entries) => {
      if (!cancelled) setRendered({language, regexById: new Map(entries)});
    });
    return () => { cancelled = true; };
  }, [favorites, language]);

  return useMemo(() => {
    if (!rendered || rendered.language !== language) return favorites;
    return favorites.map((favorite) => {
      const regex = isPoe2RegexFavorite(favorite) ? rendered.regexById.get(favorite.id) : undefined;
      return regex === undefined ? favorite : {...favorite, regex};
    });
  }, [favorites, language, rendered]);
}
