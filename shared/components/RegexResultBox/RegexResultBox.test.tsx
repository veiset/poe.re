import { Mock, vi } from "vitest";
import React, {useState} from "react";
import {render, screen, fireEvent, waitFor} from "@testing-library/react";
import RegexResultBox from "./RegexResultBox";

const Harness = () => {
  const [customText, setCustomText] = useState("foo");
  const [enableCustomText, setEnableCustomText] = useState(true);
  return (
    <RegexResultBox
      result="bar"
      reset={() => {}}
      customText={customText}
      setCustomText={setCustomText}
      enableCustomText={enableCustomText}
      setEnableCustomText={setEnableCustomText}
    />
  );
};

const ensureOptionsOpen = () => {
  const optionsBtn = screen.getByRole("button", {name: /options/i});
  // With persisted state the panel may already be open; only toggle if hidden.
  if (!screen.queryByLabelText(/auto copy result text/i)) {
    fireEvent.click(optionsBtn);
  }
};

const enableAutoCopy = () => {
  ensureOptionsOpen();
  fireEvent.click(screen.getByLabelText(/auto copy result text/i));
};

describe("RegexResultBox auto-copy", () => {
  let writeTextMock: Mock;

  beforeEach(() => {
    writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: {writeText: writeTextMock},
      configurable: true,
    });
  });

  test("writes finalResult and marks copied once on success", async () => {
    render(<Harness />);
    enableAutoCopy();

    expect(writeTextMock).toHaveBeenCalledWith("bar foo");
    await waitFor(() => expect(screen.getByText("bar foo")).toHaveClass("copied-good"));
    expect(writeTextMock).toHaveBeenCalledTimes(1);
  });

  test("does not mark copied when writeText rejects", async () => {
    writeTextMock.mockRejectedValueOnce(new Error("Clipboard write is not allowed"));

    render(<Harness />);
    enableAutoCopy();

    expect(writeTextMock).toHaveBeenCalledWith("bar foo");
    await waitFor(() => expect(writeTextMock).toHaveBeenCalledTimes(1));
    expect(screen.getByText("bar foo")).not.toHaveClass("copied-good");
  });

  test("option panel persists open/closed state to localStorage", async () => {
    const {unmount: unmountFirst} = render(<Harness />);
    const optionsButton = screen.getByRole("button", {name: /options/i});
    expect(optionsButton.textContent).toMatch(/options/i);
    expect(screen.queryByLabelText(/auto copy result text/i)).toBeInTheDocument();

    fireEvent.click(optionsButton);
    expect(screen.queryByLabelText(/auto copy result text/i)).not.toBeInTheDocument();
    unmountFirst();

    // Persisted state should carry over to a second mount
    render(<Harness />);
    await waitFor(() => expect(screen.queryByLabelText(/auto copy result text/i)).not.toBeInTheDocument());
  });

  test("favorite capture receives the exact final result including custom text", async () => {
    const onSave = vi.fn();
    render(<RegexResultBox result="bar" reset={() => {}} customText="foo" enableCustomText favorite={{mode: "create", onSave}}/>);
    fireEvent.click(screen.getByRole("button", {name: "Favorite"}));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith("bar foo"));
  });

  test("empty output disables favorite creation with an explanation", () => {
    render(<RegexResultBox result="" reset={() => {}} favorite={{mode: "create", onSave: vi.fn()}}/>);
    const button = screen.getByRole("button", {name: "Favorite"});
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("title", expect.stringMatching(/non-empty regex/i));
  });
});
