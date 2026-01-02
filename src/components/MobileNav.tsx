// components/MobileNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  PlusCircle,
  MessageCircle,
  BarChart3,
  Settings,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", icon: Home, label: "Hub" },
  { href: "/quick-log", icon: PlusCircle, label: "Log", highlight: true },
  { href: "/ai-chat", icon: MessageCircle, label: "AI" },
  { href: "/analytics", icon: BarChart3, label: "Stats" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex justify-around items-center h-16">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex flex-col items-center justify-center flex-1 h-full
                ${item.highlight ? "relative" : ""}
              `}
            >
              {item.highlight && (
                <div className="absolute -top-3 bg-blue-600 rounded-full p-3 shadow-lg">
                  <Icon className="w-6 h-6 text-white" />
                </div>
              )}
              {!item.highlight && (
                <>
                  <Icon
                    className={`w-6 h-6 ${
                      isActive ? "text-blue-600" : "text-gray-400"
                    }`}
                  />
                  <span
                    className={`text-xs mt-1 ${
                      isActive ? "text-blue-600 font-medium" : "text-gray-500"
                    }`}
                  >
                    {item.label}
                  </span>
                </>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
