import React from "react";
import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";
import ProfileImportBox from "./ProfileImportBox";
import type {RegexImportCandidate} from "@shared/core/regex/ParseRegex";

interface MockProfile {
  name: string;
  value: string;
}

describe("ProfileImportBox", () => {
  it("detects a pasted regex, displays its preview metadata and imports it on click", async () => {
    const onImport = vi.fn();
    const onImportRegex = vi.fn();
    const setShow = vi.fn();
    const candidate: RegexImportCandidate<MockProfile> = {
      pageKey: "maps",
      pageLabel: "Map mods",
      route: "/maps",
      score: 6,
      metadata: [
        {label: "Excluded map mods", value: 2},
        {label: "Atlas Drops", value: "80%"},
      ],
      settings: {name: "default", value: "parsed-map"},
    };
    const parseRegex = vi.fn().mockResolvedValue([candidate]);
    const decode = vi.fn(() => {
      throw new Error("Not a profile");
    });

    render(
      <ProfileImportBox
        existingProfiles={["default"]}
        setShow={setShow}
        onImport={onImport}
        decode={decode}
        expectedGame="poe"
        parseRegex={parseRegex}
        onImportRegex={onImportRegex}
      />,
    );

    const textarea = screen.getByPlaceholderText(/Paste profile export string or regex here/i);
    fireEvent.change(textarea, {target: {value: '"!reflect" "as d.*([89].|\\d..)%"'}});

    await waitFor(() => {
      expect(screen.getByText("Detected Regex:")).toBeInTheDocument();
    });
    expect(screen.getByText("Map mods")).toBeInTheDocument();
    expect(screen.getByText("80%")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", {name: "Import"}));
    await waitFor(() => {
      expect(onImportRegex).toHaveBeenCalledWith(candidate);
    });
    expect(onImport).not.toHaveBeenCalled();
  });

  it("allows switching target page when a regex matches multiple pages", async () => {
    const onImportRegex = vi.fn();
    const candidates: RegexImportCandidate<MockProfile>[] = [
      {
        pageKey: "waystone",
        pageLabel: "Waystones",
        route: "/waystone",
        score: 2,
        metadata: [{label: "Rarity", value: "Rare"}],
        settings: {name: "default", value: "waystone"},
      },
      {
        pageKey: "tablet",
        pageLabel: "Tablets",
        route: "/tablet",
        score: 2,
        metadata: [{label: "Rarity", value: "Rare"}],
        settings: {name: "default", value: "tablet"},
      },
    ];

    render(
      <ProfileImportBox
        existingProfiles={["default"]}
        setShow={vi.fn()}
        onImport={vi.fn()}
        decode={() => {
          throw new Error("Not a profile");
        }}
        expectedGame="poe2"
        parseRegex={vi.fn().mockResolvedValue(candidates)}
        onImportRegex={onImportRegex}
      />,
    );

    const textarea = screen.getByPlaceholderText(/Paste profile export string or regex here/i);
    fireEvent.change(textarea, {target: {value: '"y: r"'}});

    const pageSelect = await screen.findByLabelText("Target page");
    fireEvent.change(pageSelect, {target: {value: "tablet"}});

    fireEvent.click(screen.getByRole("button", {name: "Import"}));
    await waitFor(() => {
      expect(onImportRegex).toHaveBeenCalledWith(candidates[1]);
    });
  });
});
