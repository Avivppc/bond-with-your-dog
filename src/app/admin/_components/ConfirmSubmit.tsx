"use client";

interface ConfirmSubmitProps {
  /** Shown in the browser's confirm dialog; the form only submits on OK. */
  message: string;
  className: string;
  children: React.ReactNode;
}

/** Submit button for destructive forms (delete lesson / course) that asks first. */
export function ConfirmSubmit({ message, className, children }: ConfirmSubmitProps) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
