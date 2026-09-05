import {vi} from "vitest";
import React from "react";
import {render, screen, fireEvent} from "@testing-library/react";
import SelectableTokenList from "./SelectableTokenList";
import type {Token} from "@poe/types/generated/mapmods";

type T = Token<{ kind: "prefix" | "suffix" }>;

const tokens: T[] = [
  {id: 1, regex: "", rawText: "Monsters have more Life", generalizedText: "", options: {kind: "prefix"}},
  {id: 2, regex: "", rawText: "Area has Consecrated Ground", generalizedText: "", options: {kind: "suffix"}},
  {id: 3, regex: "", rawText: "Players are Cursed with Vulnerability", generalizedText: "", options: {kind: "suffix"}},
  {id: 4, regex: "", rawText: "Monsters reflect Damage", generalizedText: "", options: {kind: "prefix"}},
];

describe("SelectableTokenList", () => {
  test("renders rows without grouping or tags by default", () => {
    const setSelected = vi.fn();
    render(<SelectableTokenList elements={tokens} selected={[]} setSelected={setSelected}/>);
    expect(screen.getByText("Monsters have more Life")).toBeInTheDocument();
    expect(screen.getByText("Area has Consecrated Ground")).toBeInTheDocument();
    expect(screen.queryByText("Prefix")).toBeNull();
    expect(screen.queryByText("Suffix")).toBeNull();
  });

  test("tagFn renders a badge next to each row", () => {
    const setSelected = vi.fn();
    const tagFn = (t: Token<any>) => <span data-testid={`tag-${t.id}`}>{t.options.kind === "prefix" ? "P" : "S"}</span>;
    render(<SelectableTokenList elements={tokens} selected={[]} setSelected={setSelected} tagFn={tagFn}/>);
    expect(screen.getByTestId("tag-1")).toHaveTextContent("P");
    expect(screen.getByTestId("tag-2")).toHaveTextContent("S");
    expect(screen.getByTestId("tag-3")).toHaveTextContent("S");
    expect(screen.getByTestId("tag-4")).toHaveTextContent("P");
  });

  test("groupFn groups rows under headers in the supplied order", () => {
    const setSelected = vi.fn();
    const groupFn = (t: Token<any>) => t.options.kind === "prefix"
      ? {key: "prefix", label: "Prefix"}
      : {key: "suffix", label: "Suffix"};
    render(
      <SelectableTokenList
        elements={tokens}
        selected={[]}
        setSelected={setSelected}
        groupFn={groupFn}
        groupOrder={["prefix", "suffix"]}
      />
    );
    const headers = screen.getAllByText(/Prefix|Suffix/);
    expect(headers[0]).toHaveTextContent("Prefix");
    expect(headers[1]).toHaveTextContent("Suffix");
  });

  test("search filters before grouping and hides empty groups", () => {
    const setSelected = vi.fn();
    const groupFn = (t: Token<any>) => t.options.kind === "prefix"
      ? {key: "prefix", label: "Prefix"}
      : {key: "suffix", label: "Suffix"};
    render(
      <SelectableTokenList
        elements={tokens}
        selected={[]}
        setSelected={setSelected}
        groupFn={groupFn}
        groupOrder={["prefix", "suffix"]}
      />
    );
    const input = screen.getByPlaceholderText(/Search for a modifier/i);
    fireEvent.change(input, {target: {value: "Consecrated"}});
    // Only the suffix group should remain with its single matching row.
    expect(screen.queryByText("Prefix")).toBeNull();
    expect(screen.getByText("Suffix")).toBeInTheDocument();
    expect(screen.getByText("Area has Consecrated Ground")).toBeInTheDocument();
    expect(screen.queryByText("Monsters have more Life")).toBeNull();
  });

  test("clicking a row toggles selection", () => {
    const setSelected = vi.fn();
    render(<SelectableTokenList elements={tokens} selected={[]} setSelected={setSelected}/>);
    fireEvent.click(screen.getByText("Monsters have more Life"));
    expect(setSelected).toHaveBeenCalledWith([1]);
  });
});
