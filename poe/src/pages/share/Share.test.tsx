import React, {StrictMode} from "react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {BrowserRouter} from "react-router-dom";
import {Poe1Routes} from "@poe/layout/Poe1Routes";
import {defaultSettings} from "@poe/utils/SavedSettings";
import {shareFixtures} from "./shareFixtures";
import {loadGeneratedData} from "@shared/generatedData";
import {GeneratedDataProvider} from "@shared/components/GeneratedData/GeneratedDataProvider";

const share = shareFixtures[0];
const name = share.profile.name;
const ids = share.profile.map.badIds;
let answer: {status: number, body: unknown};
const profiles = () => JSON.parse(localStorage.getItem("profiles")!);
const mount = (path = `/share/${share.id}`) => {
  window.history.replaceState({idx: 0}, "", path);
  return render(<StrictMode><GeneratedDataProvider game="poe1"><BrowserRouter><Poe1Routes/></BrowserRouter></GeneratedDataProvider></StrictMode>);
};
const open = () => screen.findByRole("button", {name: "Import profile"});

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
    expect(fetch).toHaveBeenCalledWith(`/api/share/${share.id}`);
    expect(screen.getByRole("heading", {name})).toBeInTheDocument();
    expect(document.querySelector(".share-meta")).toHaveTextContent(/^by veiset, .+/);
    expect(document.querySelector(".share-description")!.textContent).toBe(share.description);
    expect(screen.getAllByRole("row").map((row) => row.textContent)).toEqual([
      "Map mods4 modsquantity 80pack size 35", "Tattoo1 setting changed",
    ]);
    expect(localStorage.getItem("profiles")).toBe(before);
    expect(localStorage.getItem("selectedProfile")).toBe("default");
  });

  it("opens it as a new, selected profile with the shared values on top of the defaults", async () => {
    const old = profiles().default;
    mount();
    const button = await open();
    fireEvent.click(button);
    fireEvent.click(button);
    expect(Object.keys(profiles())).toEqual(["default", name]);
    expect(profiles()[name]).toEqual({
      ...defaultSettings, name, language: "FRENCH",
      map: {...defaultSettings.map, ...share.profile.map},
      tattoo: {...defaultSettings.tattoo, ...share.profile.tattoo},
    });
    expect(profiles().default).toEqual(old);
    expect(localStorage.getItem("selectedProfile")).toBe(name);
  });

  it.each([
    [shareFixtures[0], "/maps"],
    [{...share, profile: {name: "tattoos and vendor", tattoo: {minValue: "5"}, vendor: {anySixLink: true}}}, "/tattoo"],
    [shareFixtures[1], "/vendor"],
    [{...share, profile: {name: "defaults"}}, "/favorites"],
  ])("goes to the first page the profile has settings for (%#)", async (body, page) => {
    answer.body = body;
    const replace = vi.fn();
    vi.stubGlobal("location", {...window.location, origin: window.location.origin, replace});
    mount();
    fireEvent.click(await open());
    expect(replace).toHaveBeenCalledWith(page);
  });

  it("keeps an existing profile of the same name, and opens the share beside it", async () => {
    localStorage.setItem("profiles", JSON.stringify({...profiles(), [name]: {...defaultSettings, name}}));
    mount();
    const button = await open();
    expect(screen.getByRole("heading", {name: `${name} (2)`})).toBeInTheDocument();
    fireEvent.click(button);
    expect(profiles()[name].map.badIds).toEqual([]);
    expect(profiles()[`${name} (2)`]).toMatchObject({name: `${name} (2)`, map: {badIds: ids}});
    expect(localStorage.getItem("selectedProfile")).toBe(`${name} (2)`);
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
    expect(document.querySelector(".share-meta")).toHaveTextContent("by <img src=x onerror=alert(1)>,");
    expect(document.querySelector(".share-preview img")).toBeNull();
    expect(document.querySelector(".share-description")).toBeNull();
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
    expect(screen.queryByRole("button", {name: "Import profile"})).toBeNull();
    expect(localStorage.getItem("profiles")).toBe(before);
    expect(localStorage.getItem("selectedProfile")).toBe("default");
  });

  it("lists the shares made in this browser under Favorites, linking to their share page", async () => {
    localStorage.setItem("sharedProfiles", JSON.stringify([{id: share.id, name, createdAt: share.createdAt}]));
    mount("/favorites");
    const link = await screen.findByRole("link", {name});
    expect(link.parentElement).toHaveTextContent(`${name} · shared 2026-11-20`);
    fireEvent.click(link);
    await open();
    expect(window.location.pathname).toBe(`/share/${share.id}`);
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
    expect(localStorage.getItem("selectedProfile")).toBe(name);
  });
});
