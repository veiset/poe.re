import React from "react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {act, cleanup, fireEvent, render, screen, waitFor, within} from "@testing-library/react";
import DivinationCards from "./DivinationCards";
import {ProfileContext} from "@poe/components/profile/ProfileContext";
import {defaultSettings} from "@poe/utils/SavedSettings";
import {loadSettings, updateSettings} from "@poe/utils/LocalStorage";
import * as data from "@poe/utils/loadData";
import * as economy from "@shared/economy";
import {usePoe1League} from "@shared/core/LeagueContext";
import type {DivinationCardsRegex} from "@shared/typedefs/poe1/DivinationCards";
import type {Language} from "@shared/typedefs/Language";
import type {PoeNinjaCardData} from "./DivinationData";

vi.mock("@poe/components/Header", () => ({HeaderWithLanguage: ({text}: {text: string}) => <h1>{text}</h1>}));
vi.mock("@shared/core/LeagueContext", () => ({usePoe1League: vi.fn()}));

const catalog = (language: Language): DivinationCardsRegex => ({
  tokens: [
    {id: 1, rawText: language === "PORTUGUESE" ? "O Doutor" : "The Doctor",
      generalizedText: "doctor", regex: language === "PORTUGUESE" ? "klo" : "xam",
      options: {cardId: "doctor", stackSize: 8, reward: "Headhunter", flavourText: "", icon: "", tags: []}},
    {id: 2, rawText: "Unpriced card", generalizedText: "unpriced card", regex: "unpriced",
      options: {cardId: "unpriced", stackSize: 1, reward: "", flavourText: "", icon: "", tags: []}},
  ], optimizationTable: {},
});
const prices = (price = 0.49): PoeNinjaCardData => ({
  items: [{id: "the-doctor", name: "The Doctor"}],
  lines: [{id: "the-doctor", primaryValue: price}],
});
const league = (name: string, loading = false) => vi.mocked(usePoe1League).mockReturnValue({
  league: name, leagues: ["Covens", "Standard", "Hardcore"], loading, setLeague: vi.fn(),
});
const view = (language: Language = "ENGLISH", profileName = "default") =>
  <ProfileContext.Provider value={{globalProfile: profileName, lang: language, setLang: vi.fn(), setGlobalProfile: vi.fn()}}>
    <DivinationCards/>
  </ProfileContext.Provider>;
const generate = () => screen.getByRole("button", {name: "Generate regex"});
const ready = () => waitFor(() => expect(generate()).toBeEnabled());
const doctorRow = () => screen.getByText("The Doctor").closest("li")!;
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return {promise, resolve};
};

describe("Divination Card page", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("profiles", JSON.stringify({default: defaultSettings}));
    league("Covens");
    vi.spyOn(data, "loadDivinationCards").mockImplementation(async (language) => catalog(language));
    vi.spyOn(economy, "fetchEconomyFile").mockResolvedValue(prices());
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ok: true, text: async () => "2026-11-28T05:00:00Z"}));
    Object.defineProperty(navigator, "clipboard", {configurable: true, value: {writeText: vi.fn().mockResolvedValue(undefined)}});
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it("generates from exact fractional bounds, highlights only included cards, and copies the output", async () => {
    render(view());
    await ready();
    expect(economy.fetchEconomyFile).toHaveBeenCalledWith("divination", "Covens", "DivinationCard");
    fireEvent.change(screen.getByLabelText("Min chaos"), {target: {value: "0.49"}});
    fireEvent.change(screen.getByLabelText("Max chaos"), {target: {value: "0.49"}});
    fireEvent.click(generate());
    expect(screen.getByText('"xam"')).toBeInTheDocument();
    expect(within(doctorRow()).getByText("Included")).toBeInTheDocument();
    expect(within(screen.getByText("Unpriced card").closest("li")!).getByText("No price")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", {name: "Copy"}));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith('"xam"'));
    fireEvent.change(screen.getByLabelText("Max chaos"), {target: {value: "0.5"}});
    expect(screen.queryByText('"xam"')).not.toBeInTheDocument();
    expect(screen.queryByText("Included")).not.toBeInTheDocument();
  });

  it("uses localized regexes and retains bounds when language changes", async () => {
    const page = render(view());
    await ready();
    fireEvent.change(screen.getByLabelText("Min chaos"), {target: {value: "0.49"}});
    fireEvent.click(generate());
    page.rerender(view("PORTUGUESE"));
    await ready();
    expect(screen.getByText("O Doutor")).toBeInTheDocument();
    expect(screen.getByLabelText("Min chaos")).toHaveValue(0.49);
    expect(screen.queryByText('"xam"')).not.toBeInTheDocument();
    fireEvent.click(generate());
    expect(screen.getByText('"klo"')).toBeInTheDocument();
    expect(screen.getByText("0.49 chaos")).toBeInTheDocument();
  });

  it("waits for league discovery before fetching prices", async () => {
    league("", true);
    const page = render(view());
    await screen.findByText("The Doctor");
    expect(generate()).toBeDisabled();
    expect(economy.fetchEconomyFile).not.toHaveBeenCalled();
    league("Covens");
    page.rerender(view());
    await ready();
  });

  it("ignores late price responses from a previous league", async () => {
    const oldRequest = deferred<PoeNinjaCardData>();
    vi.mocked(economy.fetchEconomyFile).mockReturnValueOnce(oldRequest.promise).mockResolvedValue(prices(1.25));
    const page = render(view());
    await screen.findByText("The Doctor");
    league("Standard");
    page.rerender(view());
    await ready();
    expect(screen.getByText("1.25 chaos")).toBeInTheDocument();
    await act(async () => oldRequest.resolve(prices(999)));
    expect(screen.queryByText("999 chaos")).not.toBeInTheDocument();
    fireEvent.click(generate());
    expect(screen.getByText('"xam"')).toBeInTheDocument();
    league("Hardcore");
    page.rerender(view());
    expect(screen.queryByText('"xam"')).not.toBeInTheDocument();
  });

  it("distinguishes a failed price request from an empty league and retries", async () => {
    vi.mocked(economy.fetchEconomyFile).mockRejectedValueOnce(new Error("Could not fetch economy data: 404"));
    render(view());
    expect(await screen.findByRole("alert")).toHaveTextContent("Price data unavailable");
    expect(screen.getByText("The Doctor")).toBeInTheDocument();
    expect(generate()).toBeDisabled();
    expect(screen.queryByText(/No card prices are available/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", {name: "Try again"}));
    await ready();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps an empty-price league's full catalog visible without a loading or error state", async () => {
    vi.mocked(economy.fetchEconomyFile).mockResolvedValue({items: [], lines: []});
    render(view());
    await screen.findByText("No card prices are available for the Covens League.");
    expect(screen.getAllByText("No price")).toHaveLength(2);
    expect(generate()).toBeDisabled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText("Loading card prices…")).not.toBeInTheDocument();
  });

  it("does not block generation when the independent refresh timestamp fails", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("offline"));
    render(view());
    await ready();
    expect(await screen.findByText(/Refresh time unavailable/)).toBeInTheDocument();
    fireEvent.click(generate());
    expect(screen.getByText('"xam"')).toBeInTheDocument();
  });

  it("can retry a failed card catalog", async () => {
    vi.mocked(data.loadDivinationCards).mockRejectedValueOnce(new Error("Catalog request failed"));
    render(view());
    expect(await screen.findByRole("alert")).toHaveTextContent("Card data unavailable");
    expect(generate()).toBeDisabled();
    fireEvent.click(screen.getByRole("button", {name: "Try again"}));
    await ready();
  });

  it("persists bounds, resets them, and preserves unrelated settings changed while the page was open", async () => {
    render(view());
    await ready();
    fireEvent.change(screen.getByLabelText("Min chaos"), {target: {value: "0.25"}});
    expect(loadSettings("default").divination.minPrice).toBe("0.25");
    updateSettings("default", (latest) => ({...latest, map: {...latest.map, quantity: "73"}}));
    fireEvent.click(screen.getByRole("button", {name: "Reset"}));
    expect(loadSettings("default").divination).toEqual(defaultSettings.divination);
    expect(loadSettings("default").map.quantity).toBe("73");
  });

  it("uses the selected profile's saved bounds without overwriting another profile", async () => {
    localStorage.setItem("profiles", JSON.stringify({
      default: defaultSettings,
      second: {...defaultSettings, name: "second", divination: {minPrice: "0.2", maxPrice: "0.8"}},
    }));
    const page = render(view());
    await ready();
    page.rerender(view("ENGLISH", "second"));
    await ready();
    expect(screen.getByLabelText("Min chaos")).toHaveValue(0.2);
    expect(loadSettings("default").divination).toEqual(defaultSettings.divination);
  });

  it("rejects reversed bounds and reports a valid range with no matching prices", async () => {
    render(view());
    await ready();
    fireEvent.change(screen.getByLabelText("Min chaos"), {target: {value: "2"}});
    fireEvent.change(screen.getByLabelText("Max chaos"), {target: {value: "1"}});
    expect(generate()).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("Min chaos no greater than Max chaos");
    fireEvent.change(screen.getByLabelText("Max chaos"), {target: {value: "3"}});
    fireEvent.click(generate());
    expect(screen.getByText("No priced cards match this range.")).toBeInTheDocument();
  });
});
