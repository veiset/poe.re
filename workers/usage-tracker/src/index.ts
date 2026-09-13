import {parseUsageEventEnvelope} from "../../../shared/core/tracking/UsageEvent";

const response = (status: number, message?: string): Response => new Response(message, {
  status,
  headers: {"cache-control": "no-store"},
});

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (request.method !== "POST" || url.pathname !== "/event") return response(404, "Not found");
    if (request.headers.get("content-type") !== "application/json") return response(415, "Expected JSON");

    let input: unknown;
    try { input = await request.json(); }
    catch { return response(400, "Invalid JSON"); }

    const event = parseUsageEventEnvelope(input);
    if (!event) return response(400, "Invalid event");

    const suppliedCountry = request.headers.get("x-visitor-country")?.toUpperCase();
    const country = suppliedCountry && /^[A-Z0-9]{2}$/.test(suppliedCountry) ? suppliedCountry : "XX";

    // A plain, flat object is intentional: Workers Observability extracts and
    // indexes every property for filtering, visualization, and grouping.
    console.log({
      logType: "usage_event",
      country,
      occurredAt: new Date().toISOString(),
      ...event,
    });

    return response(204);
  },
};
