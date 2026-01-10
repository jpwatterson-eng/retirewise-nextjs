// components/MobileNav.tsx
"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Target,
  PlusCircle,
  MessageCircle,
  BookOpen,
  BarChart3,
} from "lucide-react";

export function MobileNav() {
  const pathname = usePathname();

  const NAV_ITEMS = [
    { href: "/", icon: Home, label: "Hub" },
    { href: "/portfolio", icon: Target, label: "Portfolio" }, // Restored Target
    { href: "/quick-log", icon: PlusCircle, label: "Log", highlight: true },
    { href: "/chat", icon: MessageCircle, label: "AI" },
    { href: "/journal", icon: BookOpen, label: "Journal" }, // Restored Journal
  ];
  // pb-safe
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 h-16 shadow-lg">
      <div className="flex justify-around items-center h-full max-w-md mx-auto px-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          if (item.highlight) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative -top-4"
              >
                <div className="bg-blue-600 rounded-full p-4 shadow-lg active:scale-95 transition-transform">
                  <Icon className="w-7 h-7 text-white" />
                </div>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 py-2 transition-colors ${
                isActive ? "text-blue-600" : "text-gray-500"
              }`}
            >
              <Icon
                className={`w-6 h-6 ${isActive ? "fill-blue-50/50" : ""}`}
              />
              <span className="text-[10px] mt-1 font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
