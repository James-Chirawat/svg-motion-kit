"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Admin({ user }: { user?: { role: string } }) {
  const router = useRouter();
  useEffect(() => {
    if (!user) router.push("/login");
  }, [user, router]);
  return <h1>Admin</h1>;
}
