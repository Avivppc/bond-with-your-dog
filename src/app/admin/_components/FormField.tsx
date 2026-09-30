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
export function FormField({
  label,
  name,
  type = "text",
  required = false,
  defaultValue,
  placeholder,
  hint,
}: FormFieldProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-600">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className="px-4 py-2.5 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-orange-300 focus:outline-none"
      />
      {hint && <span className="text-xs text-slate-500">{hint}</span>}
    </label>
  );
}
