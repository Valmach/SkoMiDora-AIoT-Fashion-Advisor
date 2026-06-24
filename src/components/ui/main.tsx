import { cn } from "@/lib/utils";

export function Main({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <main
      className={cn(
        "relative w-full overflow-auto bg-background text-foreground",
        className,
      )}
      {...props}
    />
  );
}
