import { INPUT, LABEL } from "@/app/admin/_components/ui";

/** Small labelled inputs shared by the Community admin forms. */
export function Text({ label, name, value, placeholder, required, max }: { label: string; name: string; value?: string | null; placeholder?: string; required?: boolean; max: number }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={LABEL}>{label}</span>
      <input name={name} defaultValue={value ?? ""} placeholder={placeholder} required={required} maxLength={max} className={INPUT} />
    </label>
  );
}

export function Area({ label, name, value, rows = 3, max }: { label: string; name: string; value?: string | null; rows?: number; max: number }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={LABEL}>{label}</span>
      <textarea name={name} defaultValue={value ?? ""} rows={rows} maxLength={max} className={INPUT} />
    </label>
  );
}

export function Check({ label, name, checked }: { label: string; name: string; checked: boolean }) {
  return (
    <label className="flex items-center gap-2.5">
      <input type="checkbox" name={name} defaultChecked={checked} className="h-4 w-4 accent-[#343332]" />
      <span className="text-sm">{label}</span>
    </label>
  );
}
