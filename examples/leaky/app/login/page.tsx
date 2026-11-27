"use client";
import { useRouter, useSearchParams } from "next/navigation";

export default function Login() {
  const router = useRouter();
  const params = useSearchParams();
  async function onLogin() {
    const res = await fetch("/api/login", { method: "POST" });
    const { token } = await res.json();
    localStorage.setItem("token", token);
    const next = params.get("next") ?? "/";
    router.push(next);
  }
  return <button onClick={onLogin}>Log in</button>;
}
