interface ProgressBarProps {
  current: number;
  total: number;
}

export default function ProgressBar({ current, total }: ProgressBarProps) {
  const percent = Math.round((current / total) * 100);

  return (
    <div className="mb-10">
      <div className="flex justify-between items-center mb-3">
        <span className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          Question {current} of {total}
        </span>
        <span className="font-label text-xs font-bold uppercase tracking-widest text-primary">
          {percent}%
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-surface-container-high overflow-hidden">
        <div
          className="h-full rounded-full kinetic-gradient transition-all duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
