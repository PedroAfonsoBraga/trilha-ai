export default function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Stat cards skeleton */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-[#E2E8F0] bg-white p-6"
          >
            <div className="h-3 w-16 rounded bg-[#E2E8F0]" />
            <div className="mt-3 h-10 w-20 rounded bg-[#E2E8F0]" />
            <div className="mt-2 h-3 w-32 rounded bg-[#E2E8F0]" />
          </div>
        ))}
      </div>

      {/* Cronograma + Alertas skeleton */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-[#E2E8F0] bg-white p-6">
          <div className="h-5 w-48 rounded bg-[#E2E8F0]" />
          <div className="mt-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-lg bg-[#E2E8F0]" />
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-6">
          <div className="h-5 w-36 rounded bg-[#E2E8F0]" />
          <div className="mt-4 space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 rounded-lg bg-[#E2E8F0]" />
            ))}
          </div>
        </div>
      </div>

      {/* Edital + Peso skeleton */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl bg-[#0F172A] p-7">
          <div className="h-5 w-64 rounded bg-white/20" />
          <div className="mt-4 h-4 w-48 rounded bg-white/10" />
          <div className="mt-5 h-2 w-full rounded bg-white/10" />
        </div>
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-6">
          <div className="h-5 w-36 rounded bg-[#E2E8F0]" />
          <div className="mt-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i}>
                <div className="h-4 w-24 rounded bg-[#E2E8F0]" />
                <div className="mt-2 h-1.5 w-full rounded bg-[#E2E8F0]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
