import {Game, UsageEvent, UsageEventEnvelope, USAGE_EVENT_SCHEMA_VERSION} from "./UsageEvent";

const STORAGE_KEY = "poe-re.anonymous-usage-id";
const VALID_ANONYMOUS_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const createAnonymousId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined") crypto.getRandomValues(bytes);
  else for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

let memoryId: string | undefined;

const anonymousId = (): string => {
  if (memoryId) return memoryId;
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing && VALID_ANONYMOUS_ID.test(existing)) return (memoryId = existing.toLowerCase());
    const created = createAnonymousId();
    localStorage.setItem(STORAGE_KEY, created);
    return (memoryId = created);
  } catch {
    return (memoryId = createAnonymousId());
  }
};

/** Fire-and-forget, shared transport. Usage tracking must never block a user action. */
export abstract class UsageTrackingService<TEvent extends UsageEvent> {
  protected constructor(private readonly game: Game) {}

  protected track(event: TEvent): void {
    this.send(event);
  }

  private send(event: UsageEvent): void {
    const body: UsageEventEnvelope = {
      schemaVersion: USAGE_EVENT_SCHEMA_VERSION,
      anonymousId: anonymousId(),
      game: this.game,
      ...event,
    };

    void fetch("/api/usage-event", {
      method: "POST",
      headers: {"content-type": "application/json"},
      body: JSON.stringify(body),
      credentials: "same-origin",
      keepalive: true,
    }).catch(() => undefined);
  }
}
