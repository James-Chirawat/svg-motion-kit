export const revalidate = 0;

export default async function Dashboard({ ids }: { ids: string[] }) {
  const rows = [];
  for (const id of ids) {
    const r = await fetch(`https://api.example.com/rows/${id}`, { cache: "no-store" });
    rows.push(await r.json());
  }
  return <pre>{JSON.stringify(rows)}</pre>;
}
