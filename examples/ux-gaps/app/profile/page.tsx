"use client";

export default function ProfilePage() {
  async function save(form: FormData) {
    const res = await fetch("/api/profile", { method: "POST", body: form });
    if (!res.ok) return alert("Error");
    alert("Saved");
  }

  return (
    <form action={save} className="space-y-4 p-8">
      <input name="name" placeholder="Your name" className="border focus:outline-none" />
      <select name="plan"><option>Free</option></select>
      <div className="cursor-pointer" onClick={() => history.back()}>Cancel</div>
      <button type="submit">Save</button>
    </form>
  );
}
