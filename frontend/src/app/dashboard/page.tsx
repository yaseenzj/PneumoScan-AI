"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Upload, History, Activity, Clock, FileImage, ArrowRight, Skull, ShieldCheck } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"

export default function DashboardIndexPage() {
    const [recentScans, setRecentScans] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [stats, setStats] = useState({ total: 0, positive: 0, negative: 0 })

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // Fetch recent scans
                const { data: scans, error } = await supabase
                    .from('analyses')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(5)

                if (scans && !error) {
                    setRecentScans(scans)

                    // Simple stats calculation
                    const positiveCount = scans.filter(s => s.result.toLowerCase() === 'pneumonia').length
                    setStats({
                        total: scans.length,
                        positive: positiveCount,
                        negative: scans.length - positiveCount
                    })
                }
            } catch (err) {
                console.error("Failed to load dashboard data");
            } finally {
                setIsLoading(false)
            }
        }

        fetchDashboardData()
    }, [])

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Dashboard Overview</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Link href="/dashboard/upload">
                    <Card className="hover:bg-muted/50 cursor-pointer transition-colors shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">New Scan</CardTitle>
                            <Upload className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">Upload Radiograph</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Instant AI pneumonia triage
                            </p>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/dashboard/history">
                    <Card className="hover:bg-muted/50 cursor-pointer transition-colors shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">History</CardTitle>
                            <History className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">Review Past Scans</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Access stored reports and results
                            </p>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/dashboard/metrics">
                    <Card className="hover:bg-muted/50 cursor-pointer transition-colors shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">System Metrics</CardTitle>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">Model Performance</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                View RSNA validation stats
                            </p>
                        </CardContent>
                    </Card>
                </Link>
            </div>

            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-7 pt-4">
                {/* Recent Activity Feed */}
                <Card className="col-span-1 md:col-span-2 lg:col-span-4 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-blue-500" />
                            Recent Activity
                        </CardTitle>
                        <CardDescription>
                            Your latest radiograph triages.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex justify-center items-center py-8">
                                <Activity className="h-8 w-8 animate-pulse text-muted-foreground" />
                            </div>
                        ) : recentScans.length > 0 ? (
                            <div className="space-y-4">
                                {recentScans.map((scan) => (
                                    <div key={scan.id} className="flex items-center gap-4 rounded-lg border p-3 hover:bg-muted/30 transition-colors">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                                            {scan.image_data ? (
                                                <img src={scan.image_data} alt="scan" className="h-full w-full object-cover rounded-lg grayscale" />
                                            ) : (
                                                <FileImage className="h-5 w-5 text-muted-foreground" />
                                            )}
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <p className="text-sm font-medium leading-none">
                                                {scan.patient_id ? `Patient: ${scan.patient_id}` : `Scan ID: ${scan.id.substring(0, 8)}`}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(scan.created_at).toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant={scan.result === 'Pneumonia' ? 'destructive' : 'default'} className={scan.result === 'Normal' ? 'bg-green-600' : ''}>
                                                {scan.result}
                                            </Badge>
                                            <Button variant="ghost" size="icon" asChild>
                                                <Link href={`/dashboard/analyze/${scan.id}`}>
                                                    <ArrowRight className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                                No recent scans found. Upload a radiograph to get started.
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="border-t pt-4">
                        <Button variant="outline" className="w-full" asChild>
                            <Link href="/dashboard/history">View All History</Link>
                        </Button>
                    </CardFooter>
                </Card>

                {/* Quick Diagnostics */}
                <Card className="col-span-1 md:col-span-2 lg:col-span-3 shadow-sm">
                    <CardHeader>
                        <CardTitle>Session Diagnostics</CardTitle>
                        <CardDescription>Metrics from your recent analyses.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="rounded-xl bg-red-50 dark:bg-red-950/20 p-4 border border-red-100 dark:border-red-900/30">
                                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-medium mb-2">
                                    <Skull className="h-4 w-4" />
                                    Pneumonia
                                </div>
                                <div className="text-3xl font-bold text-red-700 dark:text-red-300">{stats.positive}</div>
                                <div className="text-xs text-red-600/80 mt-1">Detected cases</div>
                            </div>
                            <div className="rounded-xl bg-green-50 dark:bg-green-950/20 p-4 border border-green-100 dark:border-green-900/30">
                                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium mb-2">
                                    <ShieldCheck className="h-4 w-4" />
                                    Normal
                                </div>
                                <div className="text-3xl font-bold text-green-700 dark:text-green-300">{stats.negative}</div>
                                <div className="text-xs text-green-600/80 mt-1">Clear lungs</div>
                            </div>
                        </div>

                        <div className="rounded-lg border p-4 bg-primary/5">
                            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                <Activity className="h-4 w-4 text-primary" />
                                System Status
                            </h4>
                            <div className="space-y-2 text-sm text-muted-foreground">
                                <div className="flex justify-between">
                                    <span>AI Engine:</span>
                                    <span className="text-green-600 font-medium">Online</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Database:</span>
                                    <span className="text-green-600 font-medium">Connected</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Storage Used:</span>
                                    <span className="font-medium">{(stats.total * 0.4).toFixed(1)} MB</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
