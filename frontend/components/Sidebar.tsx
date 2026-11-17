"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Languages,
  Landmark,
  FileCheck,
  Users,
  Bell,
  Settings,
} from "lucide-react";

const menuItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Generate Document", href: "/generate-document", icon: FileCheck },
  { name: "Translation", href: "/translation", icon: Languages },
  { name: "Govt. Service Guide", href: "/government-services", icon: Landmark },
  { name: "My Documents", href: "/my-documents", icon: FileText },
  { name: "Track Application", href: "/track-application", icon: FileCheck },
  { name: "Consultancy Support", href: "/consultancy-support", icon: Users },
  { name: "Notifications", href: "/notifications", icon: Bell },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex min-h-screen w-60 shrink-0 flex-col border-r border-slate-200 bg-white px-3 py-5">
      <div className="mb-8 px-3">
        <h2 className="text-xl font-bold text-blue-700">
          Ekagajpatra
        </h2>
        <p className="text-xs text-gray-500">
          Digital Document Assistant
        </p>
      </div>

      <nav className="flex flex-col gap-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" &&
              pathname.startsWith(item.href + "/"));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Icon size={19} />
              <span>{item.name}</span>

              {item.name === "Notifications" && (
                <span className="ml-auto rounded-full bg-red-600 px-2 py-0.5 text-xs text-white">
                  3
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-gray-100 px-3 pt-5">
        <p className="text-xs text-gray-500">
          © 2026 Ekagajpatra
        </p>
      </div>
    </aside>
  );
}
