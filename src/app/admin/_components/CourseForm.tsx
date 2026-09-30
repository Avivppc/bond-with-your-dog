import { FormField } from "./FormField";
import { BTN_PRIMARY, INPUT, LABEL } from "./ui";

export interface CourseDefaults {
  id: string;
  title: string;
  description: string;
  level: string;
  category: string;
  price: number;
  badge: string | null;
  published: boolean;
}

interface CourseFormProps {
  action: (fd: FormData) => Promise<void>;
  submitLabel: string;
  /** Present when editing: the slug is fixed and the cover image is managed by its own uploader. */
  defaults?: Partial<CourseDefaults>;
}

export function CourseForm({ action, submitLabel, defaults }: CourseFormProps) {
  const editing = Boolean(defaults?.id);
  return (
    <form action={action} className="flex flex-col gap-5">
      {editing ? (
        <div className="flex flex-col gap-1.5">
          <span className={LABEL}>URL</span>
          <p className="rounded-[8px] bg-[#f5f5f4] px-3 py-2 text-sm text-[#6c6a69]">/learn/{defaults?.id}</p>
        </div>
      ) : (
        <FormField label="URL slug" name="id" required placeholder="kinetic-basics" hint="Lowercase letters, numbers and dashes. Can't be changed later." />
      )}
      <FormField label="Title" name="title" required defaultValue={defaults?.title} />
      <label className="flex flex-col gap-1.5">
        <span className={LABEL}>Description</span>
        <textarea name="description" required rows={4} defaultValue={defaults?.description ?? ""} className={INPUT} />
      </label>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>Level</span>
          <select name="level" defaultValue={defaults?.level ?? "Beginner"} className={INPUT}>
            <option>Beginner</option>
            <option>Intermediate</option>
            <option>Advanced</option>
          </select>
        </label>
        <FormField label="Category" name="category" required defaultValue={defaults?.category} placeholder="Foundations" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          label="List price ($)"
          name="price"
          type="number"
          required
          defaultValue={defaults?.price ?? 0}
          hint="0 = students can enroll for free. Paid access is sold through Offers."
        />
        <FormField label="Badge (optional)" name="badge" defaultValue={defaults?.badge} placeholder="New" />
      </div>
      <label className="flex items-center gap-2.5">
        <input type="checkbox" name="published" defaultChecked={defaults?.published ?? false} className="h-4 w-4 accent-[#343332]" />
        <span className="text-sm">Published — visible in the course catalog</span>
      </label>
      <div>
        <button type="submit" className={BTN_PRIMARY}>
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
