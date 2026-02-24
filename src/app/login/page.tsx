"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Activity, Mail } from "lucide-react";
import { supabase } from "@/lib/supabase";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner"; // Using sonner as requested by shadcn fallback

export default function LoginPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isSignUp, setIsSignUp] = useState(false);

    async function handleEmailAuth(e: React.FormEvent) {
        e.preventDefault();
        setIsLoading(true);

        try {
            if (isSignUp) {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${location.origin}/auth/callback`,
                    },
                });
                if (error) throw error;

                // If email confirmation is turned OFF, Supabase automatically returns a session
                if (data.session) {
                    toast.success("Account created! Redirecting to dashboard...");
                    router.push("/dashboard");
                } else {
                    toast.success("Check your email for the confirmation link. (Or disable 'Confirm Email' in Supabase Settings!)", { duration: 6000 });
                }
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                toast.success("Logged in successfully");
                router.push("/dashboard");
            }
        } catch (error: any) {
            toast.error(error.message || "An error occurred during authentication.");
        } finally {
            setIsLoading(false);
        }
    }



    return (
        <div className="container relative min-h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
            <Link
                href="/"
                className="absolute left-4 top-4 md:left-8 md:top-8 flex items-center gap-2 font-bold"
            >
                <Activity className="h-6 w-6 text-blue-600" />
                PneumoniaXpert
            </Link>

            <div className="relative hidden h-full flex-col bg-muted p-10 text-white dark:border-r lg:flex">
                <div className="absolute inset-0 bg-zinc-900" />
                <div className="relative z-20 flex items-center text-lg font-medium">
                    <Activity className="mr-2 h-6 w-6" />
                    PneumoniaXpert
                </div>
                <div className="relative z-20 mt-auto">
                    <blockquote className="space-y-2">
                        <p className="text-lg">
                            &ldquo;This tool has completely streamlined our triage process in the ER.
                            The AI heatmaps give our junior doctors the confidence they need before consulting a senior radiologist.&rdquo;
                        </p>
                        <footer className="text-sm">Dr. Sarah Jenkins, Head of Emergency</footer>
                    </blockquote>
                </div>
            </div>

            <div className="p-4 lg:p-8 flex h-full items-center">
                <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
                    <Card>
                        <CardHeader className="space-y-1">
                            <CardTitle className="text-2xl text-center">
                                {isSignUp ? "Create an account" : "Welcome back"}
                            </CardTitle>
                            <CardDescription className="text-center">
                                Enter your email and password below to {isSignUp ? "create your account" : "log in to your account"}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4">

                            <form onSubmit={handleEmailAuth} className="grid gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="m@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        disabled={isLoading}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="password">Password</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        disabled={isLoading}
                                    />
                                </div>
                                <Button className="w-full" type="submit" disabled={isLoading}>
                                    {isLoading && (
                                        <Activity className="mr-2 h-4 w-4 animate-spin" />
                                    )}
                                    {isSignUp ? "Sign Up" : "Sign In"}
                                </Button>
                            </form>
                        </CardContent>
                        <CardFooter>
                            <div className="text-sm text-muted-foreground text-center w-full">
                                {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
                                <button
                                    onClick={() => setIsSignUp(!isSignUp)}
                                    className="underline underline-offset-4 hover:text-primary"
                                    type="button"
                                >
                                    {isSignUp ? "Sign In" : "Sign Up"}
                                </button>
                            </div>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    );
}
