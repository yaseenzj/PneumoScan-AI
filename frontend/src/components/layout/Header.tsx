"use client";

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Activity, User, LogOut } from 'lucide-react'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'

export function Header() {
    const [user, setUser] = useState<any>(null);
    const router = useRouter();

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        fetchUser();

        // Listen for login/logout events
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };
    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 print:hidden">
            <div className="container flex h-14 items-center justify-between">
                <Link href="/" className="flex items-center space-x-2">
                    <Activity className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    <span className="font-bold inline-block">PneumoniaXpert</span>
                </Link>
                <div className="flex items-center space-x-4">
                    <ThemeToggle />
                    {user ? (
                        <>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mr-2">
                                <User className="h-4 w-4" />
                                <span className="hidden sm:inline-block truncate max-w-[150px]">{user.email}</span>
                            </div>
                            <Button asChild variant="outline">
                                <Link href="/dashboard">Dashboard</Link>
                            </Button>
                            <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sign Out">
                                <LogOut className="h-4 w-4 text-red-500" />
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="ghost" asChild>
                                <Link href="/login">Log In</Link>
                            </Button>
                            <Button asChild>
                                <Link href="/dashboard">Dashboard</Link>
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </header>
    )
}
