"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md p-10 text-center">
      <p className="text-muted-foreground">Something went wrong.</p>
      <button className="mt-4 underline" onClick={() => reset()}>Try again</button>
    </div>
  );
}
