// Skeleton shown while a screen's data is being retrieved: title, toolbar and table rows.
export default function Loading() {
  const bar = "animate-pulse rounded-lg bg-surface";
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className={`${bar} mb-7 h-8 w-56`} />
      <div className="mb-5 flex gap-2">
        <div className={`${bar} h-10 w-[318px]`} />
        <div className={`${bar} h-10 w-24`} />
        <div className={`${bar} h-10 w-32`} />
      </div>
      <div className="overflow-hidden rounded-xl border border-line">
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} className="flex h-[52px] items-center gap-6 border-b border-line px-4 last:border-b-0">
            <div className={`${bar} h-4 w-40`} />
            <div className={`${bar} h-4 w-28`} />
            <div className={`${bar} h-4 w-28`} />
            <div className={`${bar} h-4 flex-1`} />
          </div>
        ))}
      </div>
    </div>
  );
}
