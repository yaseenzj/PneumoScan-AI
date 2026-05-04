"use client";

import {
    Bar,
    BarChart,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    CartesianGrid,
    Legend,
    PieChart,
    Pie,
    Cell
} from "recharts";
import { Activity, Users, FileImage, ShieldAlert } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const COLORS = ["#16a34a", "#f87171", "#dc2626", "#4ade80"];

export default function MetricsPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({
        totalScans: 0,
        pneumoniaCount: 0,
        normalCount: 0,
        avgConfidence: 0,
        uniquePatients: 0
    });

    // Fallback data if DB is empty
    const [timeline, setTimeline] = useState([
        { name: "Mon", normal: 0, pneumonia: 0 },
        { name: "Tue", normal: 0, pneumonia: 0 },
        { name: "Wed", normal: 0, pneumonia: 0 },
        { name: "Thu", normal: 0, pneumonia: 0 },
        { name: "Fri", normal: 0, pneumonia: 0 },
        { name: "Sat", normal: 0, pneumonia: 0 },
        { name: "Sun", normal: 0, pneumonia: 0 },
    ]);

    const [confusion, setConfusion] = useState([
        { name: "True Normal", value: 0 },
        { name: "False Pneu (FP)", value: 0 },
        { name: "True Pneumonia", value: 0 },
        { name: "False Normal (FN)", value: 0 },
    ]);

    useEffect(() => {
        const fetchRealMetrics = async () => {
            try {
                const { data, error } = await supabase
                    .from('analyses')
                    .select('*');

                if (data && !error && data.length > 0) {
                    let pCount = 0;
                    let nCount = 0;
                    let totalConf = 0;
                    const patients = new Set();

                    // Count basic stats
                    data.forEach(scan => {
                        if (scan.result.toLowerCase() === 'pneumonia') pCount++;
                        else nCount++;

                        totalConf += scan.confidence;
                        if (scan.patient_id) patients.add(scan.patient_id);
                    });

                    setStats({
                        totalScans: data.length,
                        pneumoniaCount: pCount,
                        normalCount: nCount,
                        avgConfidence: (totalConf / data.length) * 100,
                        uniquePatients: patients.size
                    });

                    // Build dynamic confusion pie (approximated for demo without ground truth)
                    setConfusion([
                        { name: "Predicted Normal", value: nCount },
                        { name: "Predicted Pneumonia", value: pCount },
                    ]);

                    // Build dynamic timeline based on days of the week
                    const daysMap = { 0: "Sun", 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat" };
                    const newTimeline = [...timeline].map(t => ({ ...t, normal: 0, pneumonia: 0 }));

                    data.forEach(scan => {
                        const date = new Date(scan.created_at);
                        const dayName = daysMap[date.getDay() as keyof typeof daysMap];
                        const dayEntry = newTimeline.find(t => t.name === dayName);
                        if (dayEntry) {
                            if (scan.result.toLowerCase() === 'pneumonia') dayEntry.pneumonia++;
                            else dayEntry.normal++;
                        }
                    });

                    setTimeline(newTimeline);
                }
            } catch (err) {
                console.error("Failed to load metrics");
            } finally {
                setIsLoading(false);
            }
        };

        fetchRealMetrics();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">System Metrics</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Scans</CardTitle>
                        <FileImage className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalScans}</div>
                        <p className="text-xs text-muted-foreground">Scans across database</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pneumonia Detected</CardTitle>
                        <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{stats.pneumoniaCount}</div>
                        <p className="text-xs text-muted-foreground">{stats.totalScans > 0 ? ((stats.pneumoniaCount / stats.totalScans) * 100).toFixed(1) : 0}% of total scans</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg. Confidence</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.avgConfidence.toFixed(1)}%</div>
                        <p className="text-xs text-muted-foreground">Across all predictions</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Unique Patients</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.uniquePatients}</div>
                        <p className="text-xs text-muted-foreground">Currently logged cases</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-1 lg:col-span-4">
                    <CardHeader>
                        <CardTitle>Scan Volume (Past 7 Days)</CardTitle>
                        <CardDescription>Number of radiographs processed per day.</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={timeline}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                                    <Tooltip cursor={{ fill: "transparent" }} />
                                    <Legend />
                                    <Bar dataKey="normal" name="Normal" fill="#16a34a" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="pneumonia" name="Pneumonia" fill="#dc2626" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-1 lg:col-span-3">
                    <CardHeader>
                        <CardTitle>Session Model Distributions</CardTitle>
                        <CardDescription>Based on live data predictions.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={confusion.filter(x => x.value > 0)}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        fill="#8884d8"
                                        paddingAngle={5}
                                        dataKey="value"
                                        label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                        labelLine={false}
                                    >
                                        {confusion.filter(x => x.value > 0).map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-4 text-center text-sm">
                            <div className="bg-muted p-2 rounded">
                                <span className="block font-medium text-muted-foreground">Positivity Rate</span>
                                <span className="text-lg font-bold">{stats.totalScans > 0 ? ((stats.pneumoniaCount / stats.totalScans) * 100).toFixed(1) : 0}%</span>
                            </div>
                            <div className="bg-muted p-2 rounded">
                                <span className="block font-medium text-muted-foreground">Total Normal</span>
                                <span className="text-lg font-bold">{stats.normalCount} Cases</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
