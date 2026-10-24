import { ReactNode } from "react";

export function AvisoOk({ children }: { children: ReactNode }) {
  return (
    <div
      role="status"
      className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 font-medium text-emerald-800"
    >
      {children}
    </div>
  );
}
