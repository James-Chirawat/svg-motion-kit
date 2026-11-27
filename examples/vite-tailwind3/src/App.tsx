export default function App() {
  const loading = true;
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      {loading && (
        // svg-motion target: an animated loader goes here
        <p className="mt-6 text-muted-foreground">Loading…</p>
      )}
    </main>
  );
}
