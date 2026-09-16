import {afterEach, describe, expect, it, vi} from "vitest";
import {render, waitFor} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import Poe2Banner from "./Poe2Banner";

afterEach(() => {
  delete window.nitroAds;
});

describe("Poe2Banner", () => {
  // Guards the values NitroPay generated for this placement: a typo in either
  // the id or the options leaves the slot unfilled with no error anywhere.
  it("creates the placement NitroPay configured for poe2.re", async () => {
    const createAd = vi.fn().mockReturnValue({onNavigate: vi.fn()});
    window.nitroAds = {createAd};

    render(<MemoryRouter><Poe2Banner/></MemoryRouter>);

    await waitFor(() => expect(createAd).toHaveBeenCalledWith("ad-std-banner-nitro-001", {
      height: 250,
      delayLoading: true,
      report: {
        enabled: true,
        icon: true,
        wording: "Report Ad",
        position: "bottom-right",
      },
    }));
  });
});
