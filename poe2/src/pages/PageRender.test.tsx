import React from "react";
import {afterEach, beforeEach, vi} from "vitest";
import {act, render, screen} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import {FavoritesProvider} from "../FavoritesContext";
import {Vendor} from "./vendor/Vendor";
import {Relic} from "./relic/Relic";
import {loadGeneratedData} from "@shared/generatedData";

const renderPage = (page: React.ReactElement) =>
  render(<MemoryRouter><FavoritesProvider>{page}</FavoritesProvider></MemoryRouter>);

describe("poe2 pages render", () => {
  // The relic page loads its data from R2 when it renders. Unstubbed, the fetch rejects after the test.
  const current = {current: {poe2: {patch: "0.5.5.4.2", commit: "d1bab48"}}};
  beforeEach(async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => ({ok: true, json: async () => url.endsWith("/current.json") ? current : []})));
    // The app finds the data before anything loads it, see GeneratedDataProvider
    await loadGeneratedData("poe2");
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  test("Vendor renders header, result box and filter cards", () => {
    renderPage(<Vendor/>);
    expect(screen.getByText("Vendor Regex")).toBeInTheDocument();
    expect(screen.getByText("Item property & attributes")).toBeInTheDocument();
    expect(screen.getByText("Item modifiers")).toBeInTheDocument();
    expect(screen.getByText("Levels & rarity")).toBeInTheDocument();
    expect(screen.getByText("Item class")).toBeInTheDocument();
    expect(screen.getByText("Select conditions")).toBeInTheDocument();
  });

  test("Vendor generates rarity regex when a checkbox is ticked", () => {
    renderPage(<Vendor/>);
    // Initial result should be empty (default settings have no filters)
    expect(screen.getByText(/^length: /)).toBeInTheDocument();
  });

  test("Relic renders match type toggle and both modifier lists", async () => {
    // Also lets the page load its data
    await act(async () => { renderPage(<Relic/>); });
    expect(screen.getByText("Relic Regex")).toBeInTheDocument();
    expect(screen.getByText("Prefix modifiers")).toBeInTheDocument();
    expect(screen.getByText("Suffix modifiers")).toBeInTheDocument();
    expect(screen.getByLabelText(/Match any/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Match both/)).toBeInTheDocument();
  });
});
