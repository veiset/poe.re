import React, {StrictMode} from "react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {BrowserRouter} from "react-router-dom";
import {Poe1Routes} from "@poe/layout/Poe1Routes";
import {defaultSettings} from "@poe/utils/SavedSettings";
import {loadGeneratedData} from "@shared/generatedData";
import {GeneratedDataProvider} from "@shared/components/GeneratedData/GeneratedDataProvider";

const ids = [246480838, -2064669900];
const share = {
  id: "27ykeY8dL7", game: "poe", source: "poe.re", author: "veiset", description: "T17 juicing\nsecond line",
  createdAt: "2026-11-26T09:18:24.498Z", imports: 12,
  profile: {name: "maps", version: 2, language: "FRENCH", map: {badIds: ids, quantity: "80"}},
};
let answer: {status: number, body: unknown};
const profiles = () => JSON.parse(localStorage.getItem("profiles")!);
const mount = (path = "/share/27ykeY8dL7") => {
  window.history.replaceState({idx: 0}, "", path);
  return render(<StrictMode><GeneratedDataProvider game="poe1"><BrowserRouter><Poe1Routes/></BrowserRouter></GeneratedDataProvider></StrictMode>);
};
const open = () => screen.findByRole("button", {name: "Open"});
const row = (label: string) => screen.getByText(`${label}:`).nextElementSibling!;

describe("Share page", () => {
  beforeEach(async () => {
    answer = {status: 200, body: share};
    localStorage.clear();
    localStorage.setItem("profiles", JSON.stringify({default: {...defaultSettings, map: {...defaultSettings.map, quantity: "50"}}}));
    localStorage.setItem("selectedProfile", "default");
    localStorage.setItem("webSettings", JSON.stringify({poe1League: "Standard"}));
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith("/current.json")) return {ok: true, json: async () => ({current: {poe1: {patch: "3.29.3.3", commit: "d1bab48"}}})};
      if (String(input).startsWith("/api/share/")) {
        if (answer.status === 0) throw new TypeError("Failed to fetch");
        return {ok: answer.status < 400, status: answer.status, json: async () => answer.body};
      }
      return {ok: true, text: async () => "Standard\nHardcore"};
    }));
    // The app finds the data before anything loads it, see GeneratedDataProvider
    await loadGeneratedData("poe1");
    vi.spyOn(console, "log").mockImplementation(() => {});
    // jsdom cannot navigate documents; the browser check covers the actual redirect.
    const reportError = console.error;
    vi.spyOn(console, "error").mockImplementation((...args) => {
      if (!String(args[0]).includes("Not implemented: navigation")) reportError(...args);
    });
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("fetches the share by its id and previews it without saving anything", async () => {
    const before = localStorage.getItem("profiles");
    mount();
    await open();
    expect(fetch).toHaveBeenCalledWith("/api/share/27ykeY8dL7");
    expect(row("Name")).toHaveTextContent("maps");
    expect(row("Author")).toHaveTextContent("veiset");
    expect(row("Description").textContent).toBe("T17 juicing\nsecond line");
    expect(row("Shared")).toHaveTextContent("2026-11-26");
    expect(row("Language")).toHaveTextContent("FRENCH");
    expect(row("Selected map mods")).toHaveTextContent("2");
    expect(localStorage.getItem("profiles")).toBe(before);
    expect(localStorage.getItem("selectedProfile")).toBe("default");
  });

  it("opens it as a new, selected profile with the shared values on top of the defaults", async () => {
    const old = profiles().default;
    mount();
    const button = await open();
    fireEvent.click(button);
    fireEvent.click(button);
    expect(Object.keys(profiles())).toEqual(["default", "maps"]);
    expect(profiles().maps).toEqual({
      ...defaultSettings, name: "maps", language: "FRENCH",
      map: {...defaultSettings.map, badIds: ids, quantity: "80"},
    });
    expect(profiles().default).toEqual(old);
    expect(localStorage.getItem("selectedProfile")).toBe("maps");
  });

  it("keeps an existing profile of the same name, and opens the share beside it", async () => {
    localStorage.setItem("profiles", JSON.stringify({...profiles(), maps: {...defaultSettings, name: "maps"}}));
    mount();
    const button = await open();
    expect(row("Name")).toHaveTextContent("maps (2)");
    fireEvent.click(button);
    expect(profiles().maps.map.badIds).toEqual([]);
    expect(profiles()["maps (2)"]).toMatchObject({name: "maps (2)", map: {badIds: ids}});
    expect(localStorage.getItem("selectedProfile")).toBe("maps (2)");
  });

  it("migrates a share from an older version before it is saved", async () => {
    answer.body = {...share, profile: {name: "old", map: {badIds: ids}}};
    mount();
    fireEvent.click(await open());
    expect(console.log).toHaveBeenCalledWith("Running poe profile migration 1 -> 2 for 'old'");
    expect(profiles().old).toMatchObject({version: defaultSettings.version, map: {badIds: ids}});
  });

  it("shows the author and description as plain text", async () => {
    answer.body = {...share, author: "<img src=x onerror=alert(1)>", description: {html: "<b>x</b>"}};
    mount();
    await open();
    expect(row("Author")).toHaveTextContent("<img src=x onerror=alert(1)>");
    expect(document.querySelector(".profile-metadata-grid img")).toBeNull();
    expect(screen.queryByText("Description:")).toBeNull();
  });

  it.each([
    [404, {error: "This share doesn't exist or was removed"}, "doesn't exist or was removed"],
    [429, {error: "Too many requests"}, "Too many requests"],
    [500, {error: "Internal error"}, "Could not load the share"],
    [200, "<!doctype html>", "not a poe.re profile"],
    [200, {...share, game: "poe2"}, "not a poe.re profile"],
    [200, {...share, profile: {name: " ", version: 2}}, "profile is not valid"],
    [200, {...share, profile: "maps"}, "profile is not valid"],
    [200, {...share, profile: {name: "maps", map: "x"}}, "profile is not valid"],
  ])("shows a message and creates no profile for a share that can't be opened (%#)", async (status, body, message) => {
    answer = {status, body};
    const before = localStorage.getItem("profiles");
    mount();
    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.queryByRole("button", {name: "Open"})).toBeNull();
    expect(localStorage.getItem("profiles")).toBe(before);
    expect(localStorage.getItem("selectedProfile")).toBe("default");
  });

  it("lists the shares made in this browser under Favorites, linking to their share page", async () => {
    localStorage.setItem("sharedProfiles", JSON.stringify([{id: "27ykeY8dL7", name: "maps", createdAt: "2026-11-26T09:18:24.498Z"}]));
    mount("/favorites");
    const link = await screen.findByRole("link", {name: "maps"});
    expect(link.parentElement).toHaveTextContent("maps · shared 2026-11-26");
    fireEvent.click(link);
    await open();
    expect(window.location.pathname).toBe("/share/27ykeY8dL7");
  });

  it("shows a message when the API can't be reached", async () => {
    answer.status = 0;
    mount();
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load the share");
    expect(Object.keys(profiles())).toEqual(["default"]);
  });

  it("shows a storage error without switching profiles and allows a retry", async () => {
    mount();
    const button = await open();
    const before = localStorage.getItem("profiles");
    const fail = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
    fireEvent.click(button);
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not save");
    expect(localStorage.getItem("profiles")).toBe(before);
    expect(localStorage.getItem("selectedProfile")).toBe("default");
    fail.mockRestore();
    fireEvent.click(button);
    expect(localStorage.getItem("selectedProfile")).toBe("maps");
  });
});
