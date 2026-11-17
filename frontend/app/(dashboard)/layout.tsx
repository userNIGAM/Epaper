import Sidebar from "@/components/Sidebar";
import Header from "@/components/header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Left Sidebar */}
      <Sidebar />

      {/* Right Content */}
      <div className="flex min-w-0 flex-1 flex-col">

        <main className="flex-1 p-5 md:p-6">{children}</main>
      </div>
    </div>
  );
}
