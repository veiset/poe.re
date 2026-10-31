import React, {StrictMode} from "react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";
import {BrowserRouter} from "react-router-dom";
import {Poe1Routes} from "@poe/layout/Poe1Routes";
import * as mapData from "@poe/utils/loadData";
import {defaultSettings} from "@poe/utils/SavedSettings";
import catalog from "../../../generated/mapmods/Generated.Map.ENGLISH.json";
import frenchCatalog from "../../../generated/mapmods/Generated.Map.FRENCH.json";
import {readImport} from "./PobCodesImport";
import {loadGeneratedData} from "@shared/generatedData";

const ids = [246480838, -2064669900];
const query = (payload: unknown) => `?${new URLSearchParams({data: JSON.stringify(payload)})}`;
const valid = query({excludeIds: ids});
const profiles = () => JSON.parse(localStorage.getItem("profiles")!);
const mount = (path = `/import-pob-codes${valid}`) => {
  window.history.replaceState({idx: 0}, "", path);
  return render(<StrictMode><BrowserRouter><Poe1Routes/></BrowserRouter></StrictMode>);
};
const confirm = () => screen.findByRole("button", {name: "Import"});

describe("PoB Codes import", () => {
  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem("profiles", JSON.stringify({
      default: {...defaultSettings, language: "FRENCH", map: {...defaultSettings.map, quantity: "50"}},
    }));
    localStorage.setItem("selectedProfile", "default");
    localStorage.setItem("webSettings", JSON.stringify({poe1League: "Standard"}));
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith("/current.json")) return {ok: true, json: async () => ({current: {poe1: {patch: "3.29.3.3", commit: "d1bab48"}}})};
      if (String(input).includes("/mapmods/")) return {ok: true, json: async () => String(input).includes("FRENCH") ? frenchCatalog : catalog};
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

  it.each([
    "", "?data=e30", "?data=%%%", "?data=a",
    `?data=${"a".repeat(8193)}`, query(null), query({}),
    query({excludeIds: []}), query({excludeIds: [1.5]}), query({excludeIds: ["1"]}),
    query({excludeIds: "invalid"}), query({excludeIds: ids, extra: "ignored"}),
    ...[null, 42, [], {}].map(name => query({excludeIds: ids, name})),
  ])("rejects malformed or unsupported input (%#)", search => {
    expect(readImport(search)).toBeNull();
  });

  it("accepts catalog-sized input and deduplicates IDs", () => {
    expect(readImport(query({excludeIds: [...ids, ids[0]]}))?.excludeIds).toEqual(ids);
    expect(readImport(query({excludeIds: Array(257).fill(ids[0])}))?.excludeIds).toEqual([ids[0]]);
    const all = catalog.tokens.map(mod => mod.id);
    expect(readImport(query({excludeIds: all}))?.excludeIds).toEqual(all);
  });

  it("rejects a mixed known/unknown selection without saving any of it", async () => {
    const before = localStorage.getItem("profiles");
    mount(`/import-pob-codes${query({excludeIds: [...ids, 123456789]})}`);
    expect(await screen.findByRole("alert")).toHaveTextContent("unknown map modifiers");
    expect(screen.queryByRole("button", {name: "Import"})).toBeNull();
    expect(localStorage.getItem("profiles")).toBe(before);
    expect(localStorage.getItem("selectedProfile")).toBe("default");
  });

  it("shows a helpful catalog-load error without saving or offering an import", async () => {
    vi.spyOn(mapData, "loadMapMods").mockRejectedValue(new Error("Failed to fetch /generated/mapmods/catalog.json: 503"));
    const before = localStorage.getItem("profiles");
    mount();
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load map modifiers. Open the link again from pob.codes.");
    expect(screen.queryByRole("button", {name: "Import"})).toBeNull();
    expect(localStorage.getItem("profiles")).toBe(before);
    expect(localStorage.getItem("selectedProfile")).toBe("default");
  });

  it("previews without writes, scrubs the query, and cancels without importing", async () => {
    const before = localStorage.getItem("profiles");
    mount();
    await confirm();
    expect(screen.getByText(frenchCatalog.tokens.find(mod => mod.id === ids[1])!.rawText.replaceAll("|", " \u00b7 "))).toBeInTheDocument();
    expect(window.location.pathname).toBe("/import-pob-codes");
    expect(window.location.search).toBe("");
    expect(localStorage.getItem("profiles")).toBe(before);
    fireEvent.click(screen.getByRole("link", {name: "Cancel"}));
    await screen.findByRole("heading", {name: "Optimized Map Modifiers Regex"}, {timeout: 5000});
    expect(Object.keys(profiles())).toEqual(["default"]);
    expect(profiles().default.map.quantity).toBe("50");
    expect(localStorage.getItem("selectedProfile")).toBe("default");
  });

  it.each(["ENGLISH", "FRENCH"])("creates a profile from defaults and preserves the %s language on Maps", async language => {
    localStorage.setItem("profiles", JSON.stringify({default: {...profiles().default, language}}));
    const old = profiles().default;
    const page = mount();
    const button = await confirm();
    fireEvent.click(button);
    fireEvent.click(button);
    expect(Object.keys(profiles())).toEqual(["default", "PoB Codes"]);
    expect(profiles()["PoB Codes"]).toEqual({
      ...defaultSettings, name: "PoB Codes", language,
      map: {...defaultSettings.map, badIds: expect.arrayContaining(ids)},
    });
    page.unmount();
    mount("/maps");
    await screen.findByRole("heading", {name: "Optimized Map Modifiers Regex"}, {timeout: 5000});
    await waitFor(() => expect(document.querySelectorAll(".selectable-token-list-selected")).toHaveLength(2));
    expect(document.querySelector('select[name="language"]')).toHaveValue(language);
    expect(profiles().default).toEqual(old);
    expect(profiles()["PoB Codes"].map.badIds).toEqual(expect.arrayContaining(ids));
    expect(localStorage.getItem("selectedProfile")).toBe("PoB Codes");
  });

  it("uses current names at confirmation and gives repeated imports their own profiles", async () => {
    const page = mount();
    const button = await confirm();
    localStorage.setItem("profiles", JSON.stringify({...profiles(), "PoB Codes": {...defaultSettings, name: "PoB Codes"}}));
    fireEvent.click(button);
    page.unmount();
    mount();
    fireEvent.click(await confirm());
    expect(Object.keys(profiles())).toEqual(["default", "PoB Codes", "PoB Codes (2)", "PoB Codes (3)"]);
    expect(profiles()["PoB Codes"].map.badIds).toEqual([]);
    expect(localStorage.getItem("selectedProfile")).toBe("PoB Codes (3)");
  });

  it.each([
    ["My build", "My build"],
    ["", "PoB Codes"],
    ["   ", "PoB Codes"],
    [" My build ", "My build"],
    ["a".repeat(50), "a".repeat(50)],
    ["a".repeat(51), `${"a".repeat(47)}...`],
    ["\u{1f525}".repeat(51), `${"\u{1f525}".repeat(47)}...`],
  ])("imports the supplied name with a 50-character limit (%#)", async (name, expected) => {
    mount(`/import-pob-codes${query({excludeIds: ids, name})}`);
    const button = await confirm();
    expect(screen.getByText("Profile name:").parentElement).toHaveTextContent(`Profile name: ${expected}`);
    fireEvent.click(button);
    expect(localStorage.getItem("selectedProfile")).toBe(expected);
    expect(profiles()[expected]).toMatchObject({name: expected, map: {badIds: expect.arrayContaining(ids)}});
  });

  it("renders an HTML-looking name as plain text in the preview and saved profile", async () => {
    const name = "<img src=x onerror=alert(1)>";
    const page = mount(`/import-pob-codes${query({excludeIds: ids, name})}`);
    const button = await confirm();
    const preview = screen.getByText("Profile name:").parentElement!;
    expect(preview).toHaveTextContent(`Profile name: ${name}`);
    expect(preview.querySelector("img")).toBeNull();
    fireEvent.click(button);
    expect(profiles()[name].name).toBe(name);
    page.unmount();
    mount("/maps");
    const option = await screen.findByRole("option", {name});
    expect(option).toHaveTextContent(name);
    expect(option.querySelector("img")).toBeNull();
  });

  it.each([
    ["My build", "My build", "My build (2)"],
    ["a".repeat(51), `${"a".repeat(47)}...`, `${"a".repeat(46)} (2)`],
    ["__proto__", "default", "__proto__ (2)"],
  ])("keeps imported names unique and within 50 characters (%#)", async (name, existing, expected) => {
    localStorage.setItem("profiles", JSON.stringify({...profiles(), [existing]: {...defaultSettings, name: existing}}));
    const old = profiles()[existing];
    mount(`/import-pob-codes${query({excludeIds: ids, name})}`);
    const button = await confirm();
    expect(screen.getByText("Profile name:").parentElement).toHaveTextContent(`Profile name: ${expected}`);
    fireEvent.click(button);
    expect(localStorage.getItem("selectedProfile")).toBe(expected);
    expect(profiles()[expected].name).toBe(expected);
    expect(profiles()[existing]).toEqual(old);
  });

  it("shows a storage error without switching profiles and allows a retry", async () => {
    mount();
    const button = await confirm();
    const before = localStorage.getItem("profiles");
    const fail = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
    fireEvent.click(button);
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not save");
    expect(localStorage.getItem("profiles")).toBe(before);
    expect(localStorage.getItem("selectedProfile")).toBe("default");
    fail.mockRestore();
    fireEvent.click(button);
    expect(localStorage.getItem("selectedProfile")).toBe("PoB Codes");
  });
});
