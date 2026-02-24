"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Filter, MoreHorizontal, FileImage } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

export default function HistoryPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [filter, setFilter] = useState<"All" | "Pneumonia" | "Normal">("All");
    const [history, setHistory] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setIsLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from('analyses')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) {
                toast.error("Failed to load history");
            } else if (data) {
                setHistory(data);
            }
            setIsLoading(false);
        };
        fetchHistory();
    }, []);

    const filteredHistory = history.filter(item => {
        const patientName = item.patient_id || "";
        const matchesSearch = patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filter === "All" || item.result === filter;

        return matchesSearch && matchesFilter;
    });

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between space-y-2 md:space-y-0 pb-4">
                <h2 className="text-3xl font-bold tracking-tight">Scan History</h2>
                <div className="flex items-center space-x-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search patients or IDs..."
                            className="pl-8 w-[250px]"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="flex gap-2">
                                <Filter className="h-4 w-4" /> Filter
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Filter by Result</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setFilter("All")}>All Scans</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setFilter("Pneumonia")}>Pneumonia Detected</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setFilter("Normal")}>Normal</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[150px]">Scan ID</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Patient</TableHead>
                            <TableHead>Hospital</TableHead>
                            <TableHead>Result</TableHead>
                            <TableHead>Confidence</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    Loading history...
                                </TableCell>
                            </TableRow>
                        ) : filteredHistory.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    No results found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredHistory.map((scan) => (
                                <TableRow key={scan.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-3">
                                            {scan.image_data ? (
                                                <img src={scan.image_data} alt="Scan" className="h-8 w-8 object-cover rounded border" />
                                            ) : (
                                                <FileImage className="h-6 w-6 text-muted-foreground" />
                                            )}
                                            {scan.id.substring(0, 8)}...
                                        </div>
                                    </TableCell>
                                    <TableCell>{new Date(scan.created_at).toLocaleDateString()}</TableCell>
                                    <TableCell>{scan.patient_id}</TableCell>
                                    <TableCell className="text-muted-foreground text-sm">{scan.hospital_name || "N/A"}</TableCell>
                                    <TableCell>
                                        <Badge variant={scan.result === "Pneumonia" ? "destructive" : "default"} className={scan.result === "Normal" ? "bg-green-600 hover:bg-green-700" : ""}>
                                            {scan.result}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{(scan.confidence * 100).toFixed(1)}%</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/dashboard/analyze/${scan.id}`}>View Analysis Report</Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/dashboard/analyze/${scan.id}`}>Open to Export PDF</Link>
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
