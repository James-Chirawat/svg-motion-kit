const orders: { id: string; total: number }[] = [];

export default function OrdersPage() {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">Orders</h1>
      {orders.length === 0 ? (
        // svg-motion target: an animated empty-state illustration goes here
        <div className="mt-8 rounded-lg border border-border p-10 text-center text-muted-foreground">
          No orders yet
        </div>
      ) : null}
    </main>
  );
}
