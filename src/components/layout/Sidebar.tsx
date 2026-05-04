"use closing"
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Upload, History, BarChart2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> { }

export function Sidebar({ className }: SidebarProps) {
    const pathname = usePathname()

    const items = [
        {
            title: "Home",
            href: "/dashboard",
            icon: Home,
        },
        {
            title: "Upload",
            href: "/dashboard/upload",
            icon: Upload,
        },
        {
            title: "History",
            href: "/dashboard/history",
            icon: History,
        },
        {
            title: "Metrics",
            href: "/dashboard/metrics",
            icon: BarChart2,
        },
    ]

    return (
        <div className={cn("pb-12 border-r h-full print:hidden", className)}>
            <div className="space-y-4 py-4">
                <div className="px-3 py-2">
                    <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
                        Dashboard
                    </h2>
                    <div className="space-y-1">
                        {items.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    buttonVariants({ variant: "ghost" }),
                                    pathname === item.href
                                        ? "bg-muted hover:bg-muted"
                                        : "hover:bg-transparent hover:underline",
                                    "justify-start w-full"
                                )}
                            >
                                <item.icon className="mr-2 h-4 w-4" />
                                {item.title}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
