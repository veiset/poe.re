import "./Spinner.css";

interface SpinnerProps {
  label: string
  className?: string
}

export const Spinner = ({label, className}: SpinnerProps) => (
  <div className={className ? `spinner ${className}` : "spinner"} role="status" aria-live="polite">
    <span className="spinner-circle" aria-hidden="true"/>
    <span className="spinner-label">{label}</span>
  </div>
);
