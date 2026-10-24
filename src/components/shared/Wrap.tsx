import { cn } from "@/lib/utils";
import { ReactNode } from "react";

export function Wrap({
  children,
  wide = false,
  narrow = false,
}: {
  children: ReactNode;
  wide?: boolean;
  narrow?: boolean;
}) {
  return (
    <main
      className={cn(
        "mx-auto flex w-full flex-col gap-5 px-4 pb-16 pt-6",
        wide ? "max-w-5xl" : narrow ? "max-w-md" : "max-w-3xl",
      )}
    >
      {children}
    </main>
  );
}
