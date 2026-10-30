import { ReactNode } from "react";

export function ErrorMsg({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">
      {children}
    </p>
  );
}
