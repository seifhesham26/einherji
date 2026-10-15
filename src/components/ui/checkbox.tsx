"use client";

import * as React from "react";
import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { CheckIcon, MinusIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer size-4 shrink-0 rounded-[5px] ring-1 ring-sky-300/70 dark:ring-sky-700/70 bg-card/60 transition-all outline-none",
        "data-checked:bg-gradient-to-br data-checked:from-sky-500 data-checked:to-cyan-600 data-checked:text-white data-checked:ring-sky-400 data-checked:shadow-[0_0_8px_rgba(14,165,233,0.35)]",
        "data-indeterminate:bg-gradient-to-br data-indeterminate:from-sky-500 data-indeterminate:to-cyan-600 data-indeterminate:text-white data-indeterminate:ring-sky-400",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current"
      >
        {props.indeterminate ? (
          <MinusIcon className="size-3" aria-hidden />
        ) : (
          <CheckIcon className="size-3" aria-hidden />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
