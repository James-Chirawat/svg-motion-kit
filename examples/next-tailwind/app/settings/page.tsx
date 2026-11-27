"use client";

export default function SettingsPage() {
  async function onSubmit(form: FormData) {
    await fetch("/api/avatar", { method: "POST", body: form });
    alert("Saved");
  }

  return (
    <form action={onSubmit} className="mx-auto max-w-md space-y-4 p-8">
      <h1 className="text-xl font-semibold">Profile photo</h1>
      <input type="file" name="avatar" accept="image/*" />
      <button className="rounded-md bg-primary px-4 py-2 text-primary-foreground">Save</button>
    </form>
  );
}
