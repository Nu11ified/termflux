"use client";

import { Sidebar } from "@/components/ui/Sidebar";
import { Header } from "@/components/ui/Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // In a real app, this would come from auth context/session
  const mockUser = {
    name: "Dev User",
    email: "dev@termflux.io",
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Sidebar />
      <div className="ml-[240px] min-h-screen flex flex-col">
        <Header user={mockUser} />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
