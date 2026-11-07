import type { ReactNode } from "react";

export function Card({
  title,
  action,
  children,
  className = "",
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-3xl bg-surface p-6 shadow-card ${className}`}>
      {(title || action) && (
        <header className="mb-4 flex min-h-7 flex-wrap items-center justify-between gap-3">
          <h2 className="text-[15px] font-semibold tracking-[-0.01em]">{title}</h2>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Empty({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex min-h-24 items-center justify-center rounded-2xl bg-surface-2/60 px-4 py-6 text-center text-sm text-muted ${className}`}>
      {children}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-surface-2 motion-reduce:animate-none ${className}`} />;
}

export function Disclaimer() {
  return <p className="mt-4 text-xs text-muted">AI-generated summary, not medical advice.</p>;
}
