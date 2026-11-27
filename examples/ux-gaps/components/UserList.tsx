"use client";
import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";

export function UserList() {
  const [users, setUsers] = useState<{ id: string; name: string; avatar: string }[]>([]);
  useEffect(() => {
    fetch("/api/users").then((r) => r.json()).then(setUsers);
  }, []);

  return (
    <ul>
      {users.map((u) => (
        <li key={u.id} className="group flex items-center gap-2">
          <img src={u.avatar} className="h-8 w-8 rounded-full" />
          <span>{u.name}</span>
          <button className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => remove(u.id)}><Trash2 /></button>
        </li>
      ))}
    </ul>
  );
}

function remove(id: string) {
  return fetch(`/api/users/${id}`, { method: "DELETE" });
}
