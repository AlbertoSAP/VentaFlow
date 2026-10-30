import { cn } from "@/lib/utils";

export function segBtnCls(active: boolean) {
  return cn(
    "flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition",
    active
      ? "bg-white text-slate-900 shadow-sm"
      : "text-slate-500 hover:text-slate-800",
  );
}
