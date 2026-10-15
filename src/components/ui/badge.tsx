import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default:
          "bg-sky-50 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border-sky-300/80 dark:border-sky-700/80 shadow-[0_0_8px_rgba(14,165,233,0.12)] [a]:hover:bg-sky-100/80 dark:[a]:hover:bg-sky-900/80",
        secondary:
          "bg-sky-50/60 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 border-sky-100 dark:border-slate-800 [a]:hover:bg-sky-100/60",
        destructive:
          "bg-destructive/10 text-destructive border-destructive/20 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
        outline:
          "border-sky-200/80 dark:border-sky-800/80 text-slate-700 dark:text-slate-300 [a]:hover:bg-sky-50/80 dark:[a]:hover:bg-sky-950/50 [a]:hover:text-sky-700 dark:[a]:hover:text-sky-300",
        ghost:
          "hover:bg-sky-50/60 hover:text-sky-700 dark:hover:bg-sky-950/50 dark:hover:text-sky-300",
        link: "text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
