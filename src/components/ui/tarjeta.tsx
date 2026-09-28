import type { ComponentProps } from "react";

import { cn } from "@/lib/utils/cn";

export function Tarjeta({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-salvia-200 bg-white p-6 shadow-sm sm:p-8",
        className,
      )}
      {...props}
    />
  );
}
