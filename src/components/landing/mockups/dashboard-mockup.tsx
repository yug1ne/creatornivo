export function DashboardMockup() {
  return (
    <div className="p-4 text-left sm:p-5">
      <p className="text-sm font-bold text-foreground">Overview</p>
      <p className="text-[10px] text-muted-foreground sm:text-xs">
        Welcome back! Here&apos;s your account summary.
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          { label: "Today", value: "3 / 20", pct: 15 },
          { label: "Saved", value: "7 / 10", pct: 70 },
          { label: "Plan", value: "Free", pct: 0 },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-border bg-card p-2.5"
          >
            <p className="text-[9px] text-muted-foreground">{stat.label}</p>
            <p className="mt-0.5 text-xs font-bold text-foreground">
              {stat.value}
            </p>
            {stat.pct > 0 && (
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${stat.pct}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-lg border border-border bg-card p-3">
        <p className="text-[10px] font-medium text-foreground">Recent saves</p>
        <div className="mt-2 space-y-1.5">
          {["LinkedIn Post — Mar 15", "Newsletter — Mar 12"].map((row) => (
            <div
              key={row}
              className="flex items-center justify-between rounded-md border border-border px-2 py-1.5"
            >
              <span className="truncate text-[10px] text-foreground">{row}</span>
              <span className="text-[9px] text-muted-foreground">Mar</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}