"use client";
import { useState } from "react";

export function AvatarUpload() {
  const [svg, setSvg] = useState("");
  return (
    <div>
      <input type="file" accept="image/svg+xml" onChange={async (e) => setSvg(await e.target.files![0].text())} />
      <div dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  );
}
