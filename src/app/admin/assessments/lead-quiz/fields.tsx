import { INPUT, LABEL, MUTED } from "../../_components/ui";

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  hint?: string;
  /** Multi-line when set. */
  rows?: number;
  placeholder?: string;
}

/**
 * A labeled input or textarea for the quiz editor. No `name`: the editor submits the whole quiz
 * as one JSON field, so these stay controlled inputs only.
 */
export function TextField({ label, value, onChange, maxLength, hint, rows, placeholder }: TextFieldProps) {
  const common = {
    className: INPUT,
    value,
    maxLength,
    placeholder,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
  };
  return (
    <label className="flex flex-col gap-1.5">
      <span className={LABEL}>{label}</span>
      {rows ? <textarea rows={rows} {...common} /> : <input {...common} />}
      {hint && <span className={`text-[12px] ${MUTED}`}>{hint}</span>}
    </label>
  );
}
