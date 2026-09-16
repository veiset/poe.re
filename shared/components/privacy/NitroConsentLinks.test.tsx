import {afterEach, describe, expect, it, vi} from "vitest";
import {render} from "@testing-library/react";
import {NitroConsentLinks} from "./NitroConsentLinks";

afterEach(() => {
  delete window.nitroAds;
  delete window.__uspapi;
  delete window.__cmp;
});

describe("NitroConsentLinks", () => {
  it("renders the containers the ad script injects its links into", () => {
    const {container} = render(<NitroConsentLinks/>);

    expect(container.querySelector("[data-ccpa-link='1']")).toBeInTheDocument();
    expect(container.querySelector("#ncmp-consent-link")).toBeInTheDocument();
  });

  it("asks for both links immediately when the ad script already loaded", () => {
    window.nitroAds = {loaded: true};
    window.__uspapi = vi.fn();
    window.__cmp = vi.fn();

    render(<NitroConsentLinks/>);

    expect(window.__uspapi).toHaveBeenCalledWith("addLink", 1);
    expect(window.__cmp).toHaveBeenCalledWith("addConsentLink");
  });

  it("waits for the ad script when it has not loaded yet", () => {
    render(<NitroConsentLinks/>);

    window.nitroAds = {loaded: true};
    window.__uspapi = vi.fn();
    window.__cmp = vi.fn();
    document.dispatchEvent(new Event("nitroAds.loaded"));

    expect(window.__uspapi).toHaveBeenCalledWith("addLink", 1);
    expect(window.__cmp).toHaveBeenCalledWith("addConsentLink");
  });

  it("does not throw when neither privacy law applies to the visitor", () => {
    window.nitroAds = {loaded: true};

    expect(() => render(<NitroConsentLinks/>)).not.toThrow();
  });

  it("stops listening once unmounted", () => {
    const {unmount} = render(<NitroConsentLinks/>);
    unmount();

    window.__uspapi = vi.fn();
    document.dispatchEvent(new Event("nitroAds.loaded"));

    expect(window.__uspapi).not.toHaveBeenCalled();
  });
});
