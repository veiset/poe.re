import type {Plugin} from 'vite';
import {removedShareId, shareFixtures} from './src/pages/share/shareFixtures';
import type {ShareAnswer} from './src/pages/share/shareFixtures';

/**
 * Answers /api/share on the dev server, as poe.re does (https://poe.re/api), from the share fixtures.
 * New shares are kept in memory until the server stops. It does not check what the real API checks,
 * such as sizes, unknown fields and rate limits.
 *
 * GET /api/mock/seed fills the browser's list of shared profiles with the fixtures, and opens Favorites.
 */
export function mockShareApi(): Plugin {
  return {
    name: 'mock-share-api',
    configureServer(server) {
      const shares = new Map<string, ShareAnswer>(shareFixtures.map((share) => [share.id, {...share}]));

      server.middlewares.use('/api', (req, res) => {
        const json = (status: number, body: unknown) => {
          res.writeHead(status, {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store'});
          res.end(JSON.stringify(body));
        };
        const path = (req.url ?? '').split('?')[0];

        if (req.method === 'GET' && path === '/mock/seed') {
          const list = shareFixtures.map(({id, profile, createdAt}: ShareAnswer) => ({id, name: profile.name, createdAt}))
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .concat({id: removedShareId, name: 'removed share', createdAt: '2026-10-02T09:00:00.000Z'});
          res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
          res.end(`<script>localStorage.setItem("sharedProfiles", ${JSON.stringify(JSON.stringify(list))}); location.replace("/favorites");</script>`);
        } else if (req.method === 'GET' && path.startsWith('/share/')) {
          const share = shares.get(path.slice('/share/'.length));
          if (!share) return json(404, {error: "This share doesn't exist or was removed"});
          share.imports++;
          json(200, share);
        } else if (req.method === 'POST' && path === '/share') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', () => {
            try {
              const {profile, source, author, description} = JSON.parse(body);
              if (!profile || typeof profile !== 'object' || typeof source !== 'string') {
                return json(400, {error: 'profile and source are required'});
              }
              const id = `mock${Math.random().toString(36).slice(2, 8).padEnd(6, '0')}`;
              shares.set(id, {
                id, game: 'poe', source, ...(author && {author}), ...(description && {description}),
                createdAt: new Date().toISOString(), imports: 0, profile,
              });
              json(201, {id});
            } catch {
              json(400, {error: "The body isn't valid JSON"});
            }
          });
        } else {
          json(404, {error: 'Not found'});
        }
      });
    },
  };
}
