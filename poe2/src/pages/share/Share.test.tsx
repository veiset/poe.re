import React, {StrictMode} from "react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {BrowserRouter} from "react-router-dom";
import {Poe2Routes} from "../../layout/Poe2Routes";
import {defaultSettings} from "../../settings";
import {shareFixtures} from "./shareFixtures";
import {loadGeneratedData} from "@shared/generatedData";
import {GeneratedDataProvider} from "@shared/components/GeneratedData/GeneratedDataProvider";

const share = shareFixtures[0];
const name = share.profile.name;
let answer: {status: number, body: unknown};
let posted: any;
const profiles = () => JSON.parse(localStorage.getItem("poe2.profiles")!);
const mount = (path: string) => {
  window.history.replaceState({idx: 0}, "", path);
  return render(<StrictMode><GeneratedDataProvider game="poe2"><BrowserRouter><Poe2Routes/></BrowserRouter></GeneratedDataProvider></StrictMode>);
};

describe("poe2 sharing", () => {
  beforeEach(async () => {
    answer = {status: 200, body: share};
    posted = undefined;
    localStorage.clear();
    localStorage.setItem("poe2.profiles", JSON.stringify({default: defaultSettings}));
    localStorage.setItem("poe2.selectedProfile", "default");
    localStorage.setItem("poe2.webSettings", JSON.stringify({poe2League: "Standard"}));
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).endsWith("/current.json")) return {ok: true, json: async () => ({current: {poe2: {patch: "0.5.5.4.2", commit: "d1bab48"}}})};
      if (String(input) === "/api/share") {
        posted = JSON.parse(init!.body as string);
        return {ok: true, status: 201, json: async () => ({id: "newShare01"})};
      }
      if (String(input).startsWith("/api/share/")) return {ok: answer.status < 400, status: answer.status, json: async () => answer.body};
      return {ok: true, json: async () => [], text: async () => "Standard\nHardcore"};
    }));
    // The app finds the data before anything loads it, see GeneratedDataProvider
    await loadGeneratedData("poe2");
    vi.spyOn(console, "log").mockImplementation(() => {});
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("previews a share, and imports it as a new, selected profile on its first page", async () => {
    const replace = vi.fn();
    // The stub is a copy of the location, so the address has to be the share's before it is made
    window.history.replaceState({idx: 0}, "", `/share/${share.id}`);
    vi.stubGlobal("location", {...window.location, origin: window.location.origin, replace});
    const before = localStorage.getItem("poe2.profiles");
    mount(`/share/${share.id}`);
    // The first render also loads the lazy pages
    const button = await screen.findByRole("button", {name: "Import profile"}, {timeout: 5000});
    expect(screen.getByRole("heading", {name})).toBeInTheDocument();
    expect([...document.querySelectorAll(".share-categories li")].map((row) => row.textContent)).toEqual([
      "Waystonestier 15-16", "Tablets3 settings changed",
    ]);
    expect(localStorage.getItem("poe2.profiles")).toBe(before);
    fireEvent.click(button);
    expect(profiles()[name]).toMatchObject({name, version: defaultSettings.version, waystone: {tier: {min: 15, max: 16}, itemRarity: "50"}});
    expect(localStorage.getItem("poe2.selectedProfile")).toBe(name);
    expect(replace).toHaveBeenCalledWith("/waystone");
  });

  it("uses the live site's API on a Cloudflare Pages preview", async () => {
    window.history.replaceState({idx: 0}, "", `/share/${share.id}`);
    vi.stubGlobal("location", {...window.location, origin: window.location.origin, hostname: "veiset-share-page.poe2-production.pages.dev"});
    mount(`/share/${share.id}`);
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledWith(`https://poe2.re/api/share/${share.id}`), {timeout: 5000});
  });

  it("does not open a poe.re share", async () => {
    answer.body = {...share, game: "poe"};
    mount(`/share/${share.id}`);
    expect(await screen.findByRole("alert")).toHaveTextContent("not a poe2.re profile");
    expect(Object.keys(profiles())).toEqual(["default"]);
  });

  it("lists a share made on the Favorites page at once", async () => {
    localStorage.setItem("poe2.profiles", JSON.stringify({
      default: {...defaultSettings, waystone: {...defaultSettings.waystone, tier: {min: 15, max: 16}}},
    }));
    mount("/favorites");
    fireEvent.click(await screen.findByRole("button", {name: "Share"}, {timeout: 5000}));
    fireEvent.click(screen.getAllByRole("button", {name: "Share"}).at(-1)!);
    expect((await screen.findByText("default", {selector: "a strong"})).closest("a")).toHaveAttribute("href", "/share/newShare01");
  });

  it("shares a profile from the Share button, and lists it under Favorites", async () => {
    localStorage.setItem("poe2.profiles", JSON.stringify({
      default: {...defaultSettings, waystone: {...defaultSettings.waystone, tier: {min: 15, max: 16}}},
    }));
    const page = mount("/vendor");
    fireEvent.click(await screen.findByRole("button", {name: "Share"}));
    expect(screen.queryByRole("button", {name: "Export"})).toBeNull();
    expect(screen.getByRole("checkbox", {name: /Waystones/}).parentElement).toHaveTextContent("Waystones (tier 15-16)");
    fireEvent.click(screen.getAllByRole("button", {name: "Share"}).at(-1)!);
    await screen.findByRole("button", {name: "Copy link"});
    expect(posted).toEqual({
      source: "poe2.re",
      profile: {name: "default", version: defaultSettings.version, waystone: {tier: {min: 15}}},
    });
    page.unmount();
    mount("/favorites");
    expect((await screen.findByText("default", {selector: "a strong"})).closest("a")).toHaveAttribute("href", "/share/newShare01");
  });
});
