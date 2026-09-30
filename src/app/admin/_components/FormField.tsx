import { INPUT, LABEL } from "./ui";

interface FormFieldProps {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string | number | null;
  placeholder?: string;
  hint?: string;
}

/** Labelled text input used across admin forms (declared at module scope so it keeps state). */
export function FormField({ label, name, type = "text", required = false, defaultValue, placeholder, hint }: FormFieldProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={LABEL}>{label}</span>
      <input name={name} type={type} required={required} defaultValue={defaultValue ?? ""} placeholder={placeholder} className={INPUT} />
      {hint && <span className="text-xs text-[#6c6a69]">{hint}</span>}
    </label>
  );
}
