import React from "react";
import "./PillToggle.css";

export type PillToggleVariant = "nightmare" | "affix" | "group" | "reward";

export interface PillToggleProps {
  label: React.ReactNode;
  active: boolean;
  onToggle: () => void;
  variant: PillToggleVariant;
}

const PillToggle = ({label, active, onToggle, variant}: PillToggleProps) => (
  <button
    type="button"
    className={`pill-toggle pill-toggle-${variant}${active ? " pill-toggle-on" : ""}`}
    onClick={onToggle}
    aria-pressed={active}
  >
    {label}
  </button>
);

export default PillToggle;
