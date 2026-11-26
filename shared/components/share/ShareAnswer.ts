// No imports here: the Vite configs load this file, through the share fixtures.

/** A share, as GET /api/share/<id> answers it (https://poe.re/api). */
export interface ShareAnswer {
  id: string;
  game: string;
  source: string;
  author?: string;
  description?: string;
  createdAt: string;
  imports: number;
  profile: {name: string} & Record<string, unknown>;
}
