"use client";

import { use } from "react";
import { WindowManager } from "@/components/terminal/WindowManager";

export default function WorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <div className="h-[calc(100vh-64px)]">
      <WindowManager workspaceId={id} />
    </div>
  );
}
