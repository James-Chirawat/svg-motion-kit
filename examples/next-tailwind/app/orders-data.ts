export async function getOrders() {
  const res = await fetch("https://example.com/api/orders", { next: { revalidate: 60 } });
  return (await res.json()) as { id: string; total: number }[];
}
