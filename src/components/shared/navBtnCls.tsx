import { cn } from "@/lib/utils";

export function navBtnCls(active: boolean) {
  return cn(
    "rounded-lg px-3.5 py-2 text-sm font-semibold transition",
    active
      ? "bg-slate-900 text-white shadow-sm"
      : "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
  );
}
