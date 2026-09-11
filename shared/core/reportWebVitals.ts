import {getCLS, getFCP, getFID, getLCP, getTTFB, Metric} from "web-vitals";

type Application = "poe1" | "poe2";

declare global {
  interface Window {
    plausible?: (event: string, options?: {props?: Record<string, string | number>}) => void;
  }
}

export function reportWebVitals(application: Application): void {
  const pending: Array<[string, Record<string, string | number>]> = [];
  const reportMetric = (name: string, value: number, navigationType?: string) => {
    // Keep telemetry deliberately limited to performance metadata; never include
    // profile, favorite, regex, or other user-provided values.
    const props = {
        application,
        metric: name,
        value: Math.round(value),
        pathname: window.location.pathname,
        navigationType: navigationType ?? "navigate",
      };
    if (window.plausible) window.plausible("Web Vitals", {props});
    else pending.push(["Web Vitals", props]);
  };
  const report = (metric: Metric) => reportMetric(metric.name, metric.value, metric.navigationType);

  getCLS(report);
  getFCP(report);
  // web-vitals v2 predates INP. FID is retained as the closest supported
  // interaction metric until the dependency can be upgraded.
  getFID(report);
  getLCP(report);
  getTTFB(report);
  if ("PerformanceObserver" in window) {
    let worstInteraction = 0;
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as PerformanceEventTiming[]) {
          if (entry.interactionId && entry.duration > worstInteraction) worstInteraction = entry.duration;
        }
      });
      observer.observe({type: "event", buffered: true, durationThreshold: 16});
      const sendINP = () => {
        if (worstInteraction > 0) reportMetric("INP", worstInteraction);
        observer.disconnect();
      };
      window.addEventListener("pagehide", sendINP, {once: true});
      document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") sendINP(); }, {once: true});
    } catch {
      // Older browsers do not support event timing; the other metrics remain available.
    }
  }
  window.addEventListener("load", () => {
    if (!window.plausible) return;
    pending.splice(0).forEach(([event, props]) => window.plausible?.(event, {props}));
  }, {once: true});
}
