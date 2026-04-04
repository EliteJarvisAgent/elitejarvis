import { Sidebar } from "@/components/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#080c14]">
      <Sidebar />
      <main className="flex-1 md:ml-56 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
