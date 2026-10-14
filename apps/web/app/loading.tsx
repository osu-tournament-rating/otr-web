import { Loader2 } from 'lucide-react';

// Routes without a skeleton of their own show this while they render.
export default function AppLoading() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="flex min-h-[26rem] items-center justify-center"
    >
      <Loader2
        className="size-6 animate-spin text-muted-foreground"
        aria-hidden="true"
      />
    </div>
  );
}
