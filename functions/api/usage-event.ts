import {parseUsageEventEnvelope} from "../../shared/core/tracking/UsageEvent";

interface PagesContext {
  request: Request;
  env: {
    USAGE_TRACKER: {
      fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
    };
  };
}

type PagesHandler = (context: PagesContext) => Response | Promise<Response>;

const response = (status: number, message?: string): Response => new Response(message, {
  status,
  headers: {
    "cache-control": "no-store",
    ...(message ? {"content-type": "text/plain; charset=utf-8"} : {}),
  },
});

const isSameOrigin = (request: Request): boolean => {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try { return new URL(origin).origin === new URL(request.url).origin; }
  catch { return false; }
};

export const onRequest: PagesHandler = async ({request, env}) => {
  if (request.method !== "POST") return response(405, "Method not allowed");
  if (!isSameOrigin(request) || request.headers.get("sec-fetch-site") === "cross-site") return response(403, "Forbidden");
  if (request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") return response(415, "Expected JSON");

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > 4096) return response(413, "Payload too large");

  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > 4096) return response(413, "Payload too large");

  let json: unknown;
  try { json = JSON.parse(body); }
  catch { return response(400, "Invalid JSON"); }

  const event = parseUsageEventEnvelope(json);
  if (!event) return response(400, "Invalid event");

  const cf = (request as Request & {cf?: {country?: unknown}}).cf;
  const country = typeof cf?.country === "string" && /^[A-Z0-9]{2}$/.test(cf.country) ? cf.country : "XX";

  const tracked = await env.USAGE_TRACKER.fetch("https://usage-tracker.internal/event", {
    method: "POST",
    headers: {"content-type": "application/json", "x-visitor-country": country},
    body: JSON.stringify(event),
  });
  if (!tracked.ok) return response(502, "Tracking service unavailable");

  return response(204);
};
