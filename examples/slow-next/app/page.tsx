import Image from "next/image";
export const dynamic = "force-dynamic";

async function getUser() { return fetch("https://api.example.com/me", { cache: "no-store" }).then((r) => r.json()); }
async function getStats() { return fetch("https://api.example.com/stats", { cache: "no-store" }).then((r) => r.json()); }

export default async function Home() {
  const user = await getUser();
  const stats = await getStats();
  return (
    <main>
      <Image src="/hero.png" alt="Clinic team" width={1600} height={900} />
      <h1>สวัสดี {user.name}</h1>
      <img src="/team.jpg" alt="Our team" />
      <p>{stats.visits}</p>
    </main>
  );
}
