import React from "react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {defaultSettings, SavedSettings} from "../../utils/SavedSettings";
import ShareDialog from "./ShareDialog";

const settings: SavedSettings = {
  ...defaultSettings, name: "maps", language: "FRENCH",
  map: {...defaultSettings.map, badIds: [1, 2, 3], goodIds: [4], quantity: "80"},
  gems: {...defaultSettings.gems, selected: [7]},
  tattoo: {...defaultSettings.tattoo, minValue: "5"},
};
let answer: {status: number, body: unknown};
const body = () => JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);
const section = (name: RegExp) => screen.getByRole("checkbox", {name});
const share = () => fireEvent.click(screen.getByRole("button", {name: "Share"}));

describe("Share dialog", () => {
  beforeEach(() => {
    answer = {status: 201, body: {id: "27ykeY8dL7"}};
    vi.stubGlobal("fetch", vi.fn(async () => ({ok: answer.status < 400, status: answer.status, json: async () => answer.body})));
    render(<ShareDialog settings={settings} onClose={() => {}}/>);
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("lists every section ticked, with what it holds", () => {
    expect(screen.getAllByRole("checkbox").every((box) => (box as HTMLInputElement).checked)).toBe(true);
    expect(section(/Map mods/).parentElement).toHaveTextContent("Map mods (4 mods, quantity 80)");
    expect(section(/Gems/).parentElement).toHaveTextContent("Gems (1 gem)");
    expect(section(/Tattoo/).parentElement).toHaveTextContent("Tattoo (1 setting changed)");
    expect(section(/Vendor/).parentElement).toHaveTextContent("Vendor (no changes)");
  });

  it("shares the settings that differ from the defaults, and shows the link", async () => {
    share();
    expect(await screen.findByDisplayValue(`${window.location.origin}/share/27ykeY8dL7`)).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith("/api/share", expect.objectContaining({method: "POST", headers: {"Content-Type": "application/json"}}));
    expect(body()).toEqual({
      source: "poe.re",
      profile: {
        name: "maps", language: "FRENCH", version: defaultSettings.version,
        map: {badIds: [1, 2, 3], goodIds: [4], quantity: "80"}, gems: {selected: [7]}, tattoo: {minValue: "5"},
      },
    });
  });

  it("leaves out the sections that are unticked, and sends the name, author and description", async () => {
    fireEvent.click(section(/Map mods/));
    fireEvent.click(section(/Tattoo/));
    fireEvent.change(screen.getByLabelText("Profile name"), {target: {value: " T17 "}});
    fireEvent.change(screen.getByLabelText(/Author/), {target: {value: "veiset"}});
    fireEvent.change(screen.getByLabelText(/Description/), {target: {value: "T17 juicing\nsecond line"}});
    share();
    await screen.findByRole("button", {name: "Copy link"});
    expect(body()).toEqual({
      source: "poe.re", author: "veiset", description: "T17 juicing\nsecond line",
      profile: {name: "T17", language: "FRENCH", version: defaultSettings.version, gems: {selected: [7]}},
    });
  });

  it("shows the API's error and no link when the share is refused", async () => {
    answer = {status: 429, body: {error: "Too many shares, try again in a minute"}};
    share();
    expect(await screen.findByText("Too many shares, try again in a minute")).toBeInTheDocument();
    expect(screen.queryByRole("button", {name: "Copy link"})).toBeNull();
    expect(screen.getByRole("button", {name: "Share"})).toBeEnabled();
  });

  it("shows a message when the API can't be reached", async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError("Failed to fetch"));
    share();
    expect(await screen.findByText("Could not share the profile. Try again later.")).toBeInTheDocument();
  });
});
