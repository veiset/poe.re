import {afterEach, describe, expect, it, vi} from "vitest";
import {fireEvent, render, waitFor} from "@testing-library/react";
import {MemoryRouter, Route, Routes, useNavigate} from "react-router-dom";
import {NitroAd} from "./NitroAd";
import type {NitroAdOptions} from "@shared/core/nitroAds";

const OPTIONS: NitroAdOptions = {height: 250, delayLoading: true};

const NavigateButton = () => {
  const navigate = useNavigate();
  return <button onClick={() => navigate("/vendor")}>go</button>;
};

const renderAd = (ui = <NitroAd id="slot" options={OPTIONS}/>) =>
  render(
    <MemoryRouter initialEntries={["/favorites"]}>
      <NavigateButton/>
      <Routes>
        <Route path="*" element={ui}/>
      </Routes>
    </MemoryRouter>,
  );

afterEach(() => {
  delete window.nitroAds;
});

describe("NitroAd", () => {
  it("renders the container the ad script fills, reserving its height", () => {
    const {container} = renderAd();
    const slot = container.querySelector("#slot") as HTMLElement;

    expect(slot).toBeInTheDocument();
    expect(slot.style.minHeight).toBe("250px");
  });

  it("creates the placement with the given id and options", async () => {
    const createAd = vi.fn().mockReturnValue({onNavigate: vi.fn()});
    window.nitroAds = {createAd};

    renderAd();

    await waitFor(() => expect(createAd).toHaveBeenCalledWith("slot", OPTIONS));
  });

  it("refreshes the placement on a route change rather than recreating it", async () => {
    const onNavigate = vi.fn();
    const createAd = vi.fn().mockReturnValue({onNavigate});
    window.nitroAds = {createAd};

    const {getByText} = renderAd();
    await waitFor(() => expect(createAd).toHaveBeenCalledTimes(1));
    expect(onNavigate).not.toHaveBeenCalled();

    fireEvent.click(getByText("go"));

    await waitFor(() => expect(onNavigate).toHaveBeenCalledTimes(1));
    expect(createAd).toHaveBeenCalledTimes(1);
  });

  it("unwraps a placement that resolves asynchronously", async () => {
    const onNavigate = vi.fn();
    window.nitroAds = {createAd: vi.fn().mockResolvedValue([{onNavigate}])};

    const {getByText} = renderAd();
    await waitFor(() => expect(window.nitroAds?.createAd).toHaveBeenCalled());

    fireEvent.click(getByText("go"));

    await waitFor(() => expect(onNavigate).toHaveBeenCalledTimes(1));
  });

  it("renders without the ad script present", () => {
    expect(() => renderAd()).not.toThrow();
  });

  it("ignores a placement that resolves after unmount", async () => {
    const onNavigate = vi.fn();
    window.nitroAds = {createAd: vi.fn().mockResolvedValue({onNavigate})};

    const {unmount} = renderAd();
    unmount();

    await Promise.resolve();
    expect(onNavigate).not.toHaveBeenCalled();
  });
});
