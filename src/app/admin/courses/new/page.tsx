import Link from "next/link";
import { createCourse } from "@/app/admin/actions";

export default async function NewCoursePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="max-w-2xl">
      <Link href="/admin" className="text-sm font-bold text-orange-700 mb-4 inline-block">
        ← Courses
      </Link>
      <h1 className="text-3xl font-extrabold tracking-tighter mb-8">New course</h1>
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          {decodeURIComponent(error)}
        </div>
      )}
      <CourseForm action={createCourse} submitLabel="Create course" />
    </div>
  );
}

function CourseForm({
  action,
  submitLabel,
  defaults,
}: {
  action: (fd: FormData) => Promise<void>;
  submitLabel: string;
  defaults?: Partial<{
    id: string;
    title: string;
    description: string;
    level: string;
    category: string;
    price: number;
    badge: string;
    image: string;
    image_alt: string;
    published: boolean;
  }>;
}) {
  const Field = ({
    label,
    name,
    type = "text",
    required = false,
    defaultValue,
    placeholder,
  }: {
    label: string;
    name: string;
    type?: string;
    required?: boolean;
    defaultValue?: string | number;
    placeholder?: string;
  }) => (
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
    </label>
  );

  return (
    <form action={action} className="bg-white rounded-xl p-8 shadow-sm flex flex-col gap-5">
      <Field
        label="Course slug (URL)"
        name="id"
        required
        placeholder="kinetic-basics"
        defaultValue={defaults?.id}
      />
      <Field label="Title" name="title" required defaultValue={defaults?.title} />
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
          Description
        </span>
        <textarea
          name="description"
          required
          rows={4}
          defaultValue={defaults?.description ?? ""}
          className="px-4 py-2.5 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-orange-300 focus:outline-none"
        />
      </label>
      <div className="grid grid-cols-2 gap-5">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Level</span>
          <select
            name="level"
            defaultValue={defaults?.level ?? "Beginner"}
            className="px-4 py-2.5 rounded-lg border border-slate-200 bg-white"
          >
            <option>Beginner</option>
            <option>Intermediate</option>
            <option>Advanced</option>
          </select>
        </label>
        <Field
          label="Category"
          name="category"
          required
          defaultValue={defaults?.category}
          placeholder="Foundations"
        />
      </div>
      <div className="grid grid-cols-2 gap-5">
        <Field label="Price ($)" name="price" type="number" required defaultValue={defaults?.price ?? 0} />
        <Field label="Badge (optional)" name="badge" defaultValue={defaults?.badge} />
      </div>
      <Field label="Image URL" name="image" defaultValue={defaults?.image} />
      <Field label="Image alt text" name="image_alt" defaultValue={defaults?.image_alt} />
      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          name="published"
          defaultChecked={defaults?.published ?? true}
          className="w-4 h-4"
        />
        <span className="text-sm font-bold">Published (visible in catalog)</span>
      </label>
      <button
        type="submit"
        className="bg-orange-700 text-white px-6 py-3 rounded-full font-bold text-sm self-start"
      >
        {submitLabel}
      </button>
    </form>
  );
}

export { CourseForm };
