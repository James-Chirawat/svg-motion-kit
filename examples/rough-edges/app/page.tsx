import { Button } from "@/components/ui/button";

export default function Home({ data }: { data: any }) {
  const rows: any[] = data.rows;
  console.log(rows);
  return (
    <main>
      <h1 className="text-[#0f766e]">คลินิกของเรา</h1>
      <h1>Welcome to the clinic</h1>
      <h3 style={{ color: "#57534e" }}>Opening hours</h3>
      <p className="p-[13px] mt-[7px]">อัปเดตล่าสุด {new Date(data.updated).toLocaleDateString()}</p>
      <button className="rounded-md bg-teal-700 px-4 py-2 text-white">จองคิว</button>
      <button className="rounded bg-teal-600 px-3 py-1.5">Call us</button>
      <button className="rounded-lg bg-[#0f766e] px-5 py-2">Pay now</button>
      <button className="rounded-full bg-teal-800 px-4 py-2">Cancel booking</button>
      <Button>OK</Button>
    </main>
  );
}
