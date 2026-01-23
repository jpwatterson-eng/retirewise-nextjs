"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  HeartPulse,
  Landmark,
  Plus,
  MessageSquare,
  Target,
  BookOpen,
} from "lucide-react";

export default function NavigationDock() {
  const pathname = usePathname();

  const navItems = [
    { name: "Hub", href: "/", icon: LayoutDashboard },
    { name: "Portfolio", href: "/portfolio", icon: Target }, // 🎯 Restored
    { name: "Log", href: "/quick-log", icon: Plus, isAction: true },
    { name: "Yield", href: "/apps/income", icon: Landmark },
    { name: "Journal", href: "/journal", icon: BookOpen }, // 📖 Restored
    // We can move AI/Chat to a header icon or a secondary menu later
  ];

  return (
    <div className="fixed bottom-2 left-0 right-0 px-6 z-50 pointer-events-none">
      <nav className="max-w-md mx-auto bg-gray-900/90 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-2 shadow-2xl flex justify-around items-center pointer-events-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          if (item.isAction) {
            return (
              <Link
                key={item.name}
                href={item.href}
                className="relative -top-6"
              >
                <div className="bg-blue-600 rounded-full p-5 shadow-[0_0_20px_rgba(37,99,235,0.4)] active:scale-90 transition-all border-4 border-gray-50">
                  <Icon size={24} className="text-white" strokeWidth={3} />
                </div>
              </Link>
            );
          }

          return (
            <Link key={item.name} href={item.href} className="relative group">
              <div
                className={`p-4 rounded-full transition-all duration-300 ${
                  isActive
                    ? "bg-white/10 text-emerald-400"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
