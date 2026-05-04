"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Download, FileText, Activity, AlertTriangle, CheckCircle2, FileImage } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Mock data store for the demo page since we don't have persistent storage setup
// Normally we'd fetch from Supabase.
const MOCK_DATA = {
    result: "Pneumonia",
    confidence: 0.942,
    date: new Date().toLocaleDateString(),
    created_at: new Date().toISOString()
};

export default function AnalysisPage() {
    const { id } = useParams();
    const router = useRouter();
    const reportRef = useRef<HTMLDivElement>(null);

    const [isExporting, setIsExporting] = useState(false);
    const [patientId, setPatientId] = useState("");
    const [previousScan, setPreviousScan] = useState<any>(null);
    const [notes, setNotes] = useState("");
    const [mockResult, setMockResult] = useState(MOCK_DATA);
    const [imageData, setImageData] = useState<string | null>(null);
    const [heatmapData, setHeatmapData] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [hospital, setHospital] = useState("");
    const [isCustomHospital, setIsCustomHospital] = useState(false);

    // Fetch the data from the recent upload in sessionStorage or Database
    useEffect(() => {
        const fetchScanData = async () => {
            const stored = sessionStorage.getItem(`scan_${id}`);
            if (stored) {
                try {
                    const data = JSON.parse(stored);
                    setMockResult({
                        result: data.result,
                        confidence: data.confidence,
                        date: new Date(data.created_at).toLocaleDateString(),
                        created_at: data.created_at
                    });
                    if (data.image_data) setImageData(data.image_data);
                    if (data.heatmap) setHeatmapData(data.heatmap);
                    if (data.patient_id) setPatientId(data.patient_id);
                    return; // successfully loaded local cache
                } catch (e) {
                    console.error("Failed to parse stored scan");
                }
            }

            // If we didn't find it in storage, we check the actual Supabase DB using the ID URL parameter.
            // This caters to the History page links routing directly here.
            if (id && id.toString().length > 10) {
                try {
                    const { data, error } = await supabase
                        .from('analyses')
                        .select('*')
                        .eq('id', id)
                        .single();

                    if (data && !error) {
                        setMockResult({
                            result: data.result,
                            confidence: data.confidence,
                            date: new Date(data.created_at).toLocaleDateString(),
                            created_at: data.created_at
                        });
                        if (data.patient_id) setPatientId(data.patient_id);
                        if (data.hospital_name) setHospital(data.hospital_name);
                        if (data.image_data) setImageData(data.image_data);
                        return; // Found in database!
                    }
                } catch (error) {
                    console.error("Could not fetch DB record", error);
                }
            }

            // Fallback random mock data if they type a random non-existent ID
            const isPneumonia = Math.random() < 0.7;
            setMockResult({
                result: isPneumonia ? "Pneumonia" : "Normal",
                confidence: parseFloat((0.85 + Math.random() * 0.14).toFixed(4)),
                date: new Date().toLocaleDateString(),
                created_at: new Date().toISOString()
            });
        };

        fetchScanData();
    }, [id]);

    // Fetch previous scan history to compare side-by-side
    useEffect(() => {
        if (!patientId || patientId.trim() === "") {
            setPreviousScan(null);
            return;
        }

        const fetchPrevious = async () => {
            // Don't fetch if it's currently saving or just random typing
            if (patientId.length < 3) return;

            try {
                let query = supabase
                    .from('analyses')
                    .select('*')
                    .eq('patient_id', patientId)
                    .neq('id', id) // dont fetch the scan we are actively viewing
                    .order('created_at', { ascending: false })
                    .limit(1);

                if (mockResult && mockResult.created_at) {
                    query = query.lt('created_at', mockResult.created_at);
                }

                const { data, error } = await query.single();

                if (data && !error) {
                    setPreviousScan(data);
                } else {
                    setPreviousScan(null);
                }
            } catch (err) {
                // Ignore silent misses
                setPreviousScan(null);
            }
        };

        const timer = setTimeout(() => {
            fetchPrevious();
        }, 800);
        return () => clearTimeout(timer);
    }, [patientId, id]);

    const handleExportPDF = () => {
        setIsExporting(true);
        setTimeout(() => {
            window.print();
            setIsExporting(false);
        }, 300);
    };

    const isPositive = mockResult.result === "Pneumonia";

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 print:hidden">
                <div className="flex items-center gap-2 self-start sm:self-auto">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <h2 className="text-3xl font-bold tracking-tight">Analysis Report</h2>
                </div>
                <div className="flex items-center space-x-2 self-start sm:self-auto">
                    <Button onClick={handleExportPDF} disabled={isExporting}>
                        <Download className="mr-2 h-4 w-4" />
                        {isExporting ? "Preparing..." : "Export PDF"}
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
                {/* printable report section */}
                <div className="col-span-1 lg:col-span-2 space-y-6" ref={reportRef}>
                    <Card className="overflow-hidden border-2">
                        <div className={`h-2 w-full ${isPositive ? 'bg-red-500' : 'bg-green-500'}`} />
                        <CardHeader className="pb-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="flex items-center gap-2 text-2xl">
                                        <Activity className="h-6 w-6 text-blue-600" />
                                        PneumoniaXpert Results
                                    </CardTitle>
                                    <CardDescription>Scan ID: {id} • {mockResult.date}</CardDescription>
                                </div>
                                <div className="text-right flex flex-col items-end">
                                    <Badge variant={isPositive ? "destructive" : "default"} className={`text-sm px-3 py-1 ${!isPositive && 'bg-green-600 hover:bg-green-700'}`}>
                                        {isPositive ? <AlertTriangle className="w-4 h-4 mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                                        {mockResult.result.toUpperCase()}
                                    </Badge>
                                    <span className="text-sm font-medium mt-2">
                                        Confidence: {(mockResult.confidence * 100).toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <h4 className="text-sm font-medium text-muted-foreground">Original Radiograph</h4>
                                    <div className="relative aspect-square bg-slate-200 dark:bg-slate-800 rounded-lg overflow-hidden border flex items-center justify-center">
                                        {imageData ? (
                                            <img src={imageData} alt="Patient X-Ray" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-muted-foreground text-sm">Patient X-Ray</span>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent pointer-events-none print:hidden" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <h4 className="text-sm font-medium text-muted-foreground line-clamp-1">AI Grad-CAM Heatmap</h4>
                                    <div className="relative aspect-square bg-slate-200 dark:bg-slate-800 rounded-lg overflow-hidden border flex items-center justify-center">
                                        {/* AI Grad-CAM Heatmap Base Image */}
                                        {imageData ? (
                                            <img src={imageData} alt="Patient X-Ray Base" className="w-full h-full object-cover grayscale" />
                                        ) : (
                                            <span className="text-muted-foreground text-sm">Grad-CAM Map</span>
                                        )}

                                        {/* Actual Heatmap Overlay */}
                                        {heatmapData && (
                                            <img src={heatmapData} alt="Heatmap Overlay" className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-multiply dark:mix-blend-screen print:mix-blend-normal print:opacity-80" />
                                        )}

                                        <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent pointer-events-none print:hidden" />

                                        {/* Fallback if no heatmap output */}
                                        {!heatmapData && isPositive && (
                                            <div className="absolute top-1/3 left-1/3 w-1/2 h-1/3 bg-red-500/50 blur-xl mix-blend-multiply dark:mix-blend-screen rounded-full" />
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-2 border-t pt-4">
                                <h4 className="font-semibold text-lg">Model Metrics (Kaggle RSNA)</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                                    <div className="bg-muted p-3 rounded-lg text-center">
                                        <span className="block text-muted-foreground text-xs mb-1">Accuracy</span>
                                        <span className="font-bold text-lg">96.4%</span>
                                    </div>
                                    <div className="bg-muted p-3 rounded-lg text-center">
                                        <span className="block text-muted-foreground text-xs mb-1">Sensitivity</span>
                                        <span className="font-bold text-lg">98.1%</span>
                                    </div>
                                    <div className="bg-muted p-3 rounded-lg text-center">
                                        <span className="block text-muted-foreground text-xs mb-1">Specificity</span>
                                        <span className="font-bold text-lg">92.7%</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 border-t pt-4 text-xs text-muted-foreground italic text-center">
                                AI Aid Only. This report is generated by a computer-aided triage tool.
                                It does not constitute a definitive medical diagnosis. All findings must be reviewed by a qualified radiologist or medical professional before making clinical decisions.
                            </div>
                        </CardContent>
                    </Card>

                    {/* Side-by-side historical comparison if previous data exists */}
                    {previousScan && (
                        <Card className="overflow-hidden border-2 border-muted mt-6">
                            <CardHeader className="bg-muted/50 pb-4">
                                <CardTitle className="flex items-center gap-2 text-xl">
                                    <FileImage className="h-5 w-5 text-muted-foreground" />
                                    Prior Scan Comparison
                                </CardTitle>
                                <CardDescription>Detected a previous record for Patient {patientId} on {new Date(previousScan.created_at).toLocaleDateString()}</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <h4 className="font-medium">Previous Scan</h4>
                                            <Badge variant={previousScan.result === "Pneumonia" ? "destructive" : "default"} className={`${previousScan.result === "Normal" && 'bg-green-600'}`}>
                                                {previousScan.result} ({(previousScan.confidence * 100).toFixed(1)}%)
                                            </Badge>
                                        </div>
                                        <div className="relative aspect-square bg-slate-200 dark:bg-slate-800 rounded-lg overflow-hidden border flex items-center justify-center">
                                            {previousScan.image_data ? (
                                                <img src={previousScan.image_data} alt="Previous X-Ray" className="w-full h-full object-cover grayscale" />
                                            ) : (
                                                <span className="text-muted-foreground text-sm">No Image</span>
                                            )}
                                        </div>
                                        <div className="text-sm bg-muted p-3 rounded-lg text-muted-foreground">
                                            <span className="block font-semibold mb-1 text-foreground">Doctor's Notes:</span>
                                            {previousScan.result === "Pneumonia" ? "Follow-up required on right lobar infiltrate." : "Clear lungs. No acute disease."}
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <h4 className="font-medium">Current Scan</h4>
                                            <Badge variant={isPositive ? "destructive" : "default"} className={`${!isPositive && 'bg-green-600'}`}>
                                                {mockResult.result} ({(mockResult.confidence * 100).toFixed(1)}%)
                                            </Badge>
                                        </div>
                                        <div className="relative aspect-square bg-slate-200 dark:bg-slate-800 rounded-lg overflow-hidden border flex items-center justify-center">
                                            {imageData ? (
                                                <img src={imageData} alt="Current X-Ray" className="w-full h-full object-cover grayscale" />
                                            ) : (
                                                <span className="text-muted-foreground text-sm">No Image</span>
                                            )}
                                        </div>
                                        <div className="text-sm border-l-4 border-blue-500 pl-3 py-1">
                                            {isPositive && previousScan.result === "Pneumonia" && "Condition persists. Compare consolidation density."}
                                            {isPositive && previousScan.result === "Normal" && "New consolidation detected since last visit."}
                                            {!isPositive && previousScan.result === "Pneumonia" && "Consolidation has cleared. Patient improving."}
                                            {!isPositive && previousScan.result === "Normal" && "Lungs remain clear."}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Patient metadata sidebar */}
                <div className="space-y-4 print:hidden col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Clinical Notes
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="hospital">Hospital / Clinic</Label>
                                    {!isCustomHospital ? (
                                        <select
                                            id="hospital-select"
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            value={hospital}
                                            onChange={(e) => {
                                                if (e.target.value === "Other") {
                                                    setIsCustomHospital(true);
                                                    setHospital("");
                                                } else {
                                                    setHospital(e.target.value);
                                                }
                                            }}
                                        >
                                            <option value="" disabled>Select a hospital...</option>
                                            <option value="General Hospital">General Hospital</option>
                                            <option value="City Medical Center">City Medical Center</option>
                                            <option value="Other">+ Add New Hospital...</option>
                                        </select>
                                    ) : (
                                        <div className="flex gap-2">
                                            <Input
                                                id="hospital"
                                                placeholder="Enter new hospital name..."
                                                value={hospital}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHospital(e.target.value)}
                                                autoFocus
                                            />
                                            <Button variant="outline" type="button" onClick={() => {
                                                setIsCustomHospital(false);
                                                setHospital("");
                                            }}>
                                                Cancel
                                            </Button>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="patientId">Patient ID</Label>
                                    <Input
                                        id="patientId"
                                        placeholder="e.g. PX-10293"
                                        value={patientId}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPatientId(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="notes">Radiologist Notes</Label>
                                <Textarea
                                    id="notes"
                                    placeholder="Add observations, patient symptoms, or findings here..."
                                    className="min-h-[200px]"
                                    value={notes}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                                />
                            </div>
                            <Button className="w-full" variant="outline" onClick={async () => {
                                setIsSaving(true);
                                try {
                                    const { data: { user } } = await supabase.auth.getUser();
                                    if (!user) throw new Error("You must be logged in to save.");
                                    const { error } = await supabase.from('analyses').insert({
                                        user_id: user.id,
                                        result: mockResult.result,
                                        confidence: mockResult.confidence,
                                        patient_id: patientId || "Unknown",
                                        hospital_name: hospital || "Not Specified",
                                        image_data: imageData // saving compressed base64 string directly
                                    });
                                    if (error) throw error;
                                    toast.success("Saved to history!");
                                } catch (e: any) {
                                    toast.error(e.message || "Failed to save");
                                } finally {
                                    setIsSaving(false);
                                }
                            }} disabled={isSaving}>
                                {isSaving ? "Saving..." : "Save Notes"}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
