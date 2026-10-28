import {useState} from "react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {act, cleanup, fireEvent, render, screen} from "@testing-library/react";
import {Link, MemoryRouter, Outlet, Route, Routes} from "react-router-dom";
import {fetchGeneratedFile, loadGeneratedData} from "@shared/generatedData";
import {GeneratedDataFileError} from "./GeneratedDataFileError";

const current = {current: {poe1: {patch: "3.29.3.3", commit: "d1bab48"}}};
// current.json, and a 404 for every file
const fetchMock = vi.fn(async (url: string) =>
  url.endsWith("/current.json") ? {ok: true, json: async () => current} : {ok: false, status: 404, statusText: "Not Found"});

// A layout with the error above its pages, and a language to switch
const App = () => {
  const [language, setLanguage] = useState("FRENCH");
  return (
    <MemoryRouter initialEntries={["/boat"]}>
      <button type="button" onClick={() => setLanguage("ENGLISH")}>English</button>
      <Routes>
        <Route element={<><GeneratedDataFileError language={language}/><Outlet/></>}>
          <Route path="boat" element={<p>Boat <Link to="/maps">Maps</Link></p>}/>
          <Route path="maps" element={<p>Maps page</p>}/>
        </Route>
      </Routes>
    </MemoryRouter>
  );
};

// Fails a request for the French boat mods, as R2 only has English ones
const failBoatMods = () => act(async () => {
  await expect(fetchGeneratedFile("boatmods/Generated.BoatMods.FRENCH.min.json")).rejects.toThrow("404");
});

describe("GeneratedDataFileError", () => {
  beforeEach(async () => {
    vi.stubGlobal("fetch", fetchMock);
    await loadGeneratedData("poe1");
    render(<App/>);
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("says when a file failed to load, keeps the page, and forgets it on the next page", async () => {
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await failBoatMods();
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Some data couldn't be loaded");
    expect(alert).toHaveTextContent("Generated.BoatMods.FRENCH.min.json?v=d1bab48: 404 Not Found");
    expect(screen.getByText("Boat")).toBeInTheDocument();

    await act(async () => fireEvent.click(screen.getByRole("link", {name: "Maps"})));
    expect(screen.getByText("Maps page")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("forgets a file that failed to load when the language changes", async () => {
    await failBoatMods();
    expect(screen.getByRole("alert")).toBeInTheDocument();

    await act(async () => fireEvent.click(screen.getByRole("button", {name: "English"})));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("Boat")).toBeInTheDocument();
  });
});
