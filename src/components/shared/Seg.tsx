import { ReactNode } from "react";

export function Seg({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-1 rounded-xl bg-slate-100 p-1">{children}</div>
  );
}
