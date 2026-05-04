"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useDropzone } from "react-dropzone"
import { UploadCloud, FileImage, X, Activity, AlertCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function DashboardPage() {
    const router = useRouter()
    const [file, setFile] = useState<File | null>(null)
    const [preview, setPreview] = useState<string | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [progress, setProgress] = useState(0)
    const [patientName, setPatientName] = useState("")

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const selectedFile = acceptedFiles[0]

        // Quick validation (Dropzone handles mime types, but good to be safe)
        if (selectedFile.size > 10 * 1024 * 1024) {
            toast.error("File is too large. Max size is 10MB.")
            return
        }

        setFile(selectedFile)

        // Create preview
        const objectUrl = URL.createObjectURL(selectedFile)
        setPreview(objectUrl)
    }, [])

    const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
        onDrop,
        accept: {
            'image/jpeg': ['.jpeg', '.jpg'],
            'image/png': ['.png'],
            // Note: DICOM processing usually requires a specialized library (like dicom-parser/cornerstone)
            // For this hackathon demo, we'll accept typical image formats.
            'application/dicom': ['.dcm']
        },
        maxFiles: 1
    })

    const removeFile = useCallback(() => {
        setFile(null)
        if (preview) {
            URL.revokeObjectURL(preview)
            setPreview(null)
        }
    }, [preview])

    const handleAnalyze = async () => {
        if (!file) return

        setIsUploading(true)
        setProgress(10)

        try {
            // Simulate file upload and processing delay
            const interval = setInterval(() => {
                setProgress((prev) => {
                    if (prev >= 90) {
                        clearInterval(interval)
                        return 90
                    }
                    return prev + 15
                })
            }, 500)

            // Compress image using canvas to avoid sessionStorage 5MB limit
            const base64 = await new Promise<string>((resolve, reject) => {
                const img = new Image()
                img.onload = () => {
                    const canvas = document.createElement("canvas")
                    const MAX_WIDTH = 800
                    const MAX_HEIGHT = 800
                    let width = img.width
                    let height = img.height

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width
                            width = MAX_WIDTH
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height
                            height = MAX_HEIGHT
                        }
                    }
                    canvas.width = width
                    canvas.height = height

                    const ctx = canvas.getContext("2d")
                    ctx?.drawImage(img, 0, 0, width, height)
                    resolve(canvas.toDataURL("image/jpeg", 0.7)) // 70% quality jpeg
                }
                img.onerror = error => reject(error)
                img.src = URL.createObjectURL(file)
            })

            setProgress(50)

            // Call our dummy mock API
            const response = await fetch('/api/predict', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ image: base64, filename: file.name }),
            })

            if (!response.ok) {
                throw new Error("Failed to analyze image")
            }

            const data = await response.json()

            if (patientName.trim()) {
                data.patient_id = patientName.trim()
            }

            clearInterval(interval)
            setProgress(100)

            toast.success("Analysis complete!")
            // Clear out any old cached scans to prevent hitting the 5MB sessionStorage quota
            Object.keys(sessionStorage).forEach(key => {
                if (key.startsWith('scan_')) {
                    sessionStorage.removeItem(key)
                }
            })
            // Save data for the target page to read
            sessionStorage.setItem(`scan_${data.id}`, JSON.stringify(data))

            // Navigate to the analysis page with the returned ID
            setTimeout(() => {
                router.push(`/dashboard/analyze/${data.id}`)
            }, 500)
        } catch (error: any) {
            toast.error(error.message || "An error occurred during analysis")
            setIsUploading(false)
            setProgress(0)
        }
    }

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">X-Ray Analysis</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card className="col-span-2">
                    <CardHeader>
                        <CardTitle>Upload Radiograph</CardTitle>
                        <CardDescription>
                            Drag and drop a chest PA/AP x-ray for immediate AI triage. Supported formats: JPEG, PNG, DICOM.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {!file ? (
                            <div
                                {...getRootProps()}
                                className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors
                  ${isDragActive ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20" : "border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"}
                  ${isDragReject ? "border-red-500 bg-red-50 dark:bg-red-950/20" : ""}
                `}
                            >
                                <input {...getInputProps()} />
                                <div className="flex flex-col items-center justify-center space-y-4">
                                    <div className="p-4 bg-primary/10 rounded-full">
                                        <UploadCloud className="w-10 h-10 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg">Click or drag image here</h3>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Max file size: 10MB
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="relative rounded-xl overflow-hidden border bg-muted/30 aspect-video flex items-center justify-center">
                                    {file.type.startsWith('image/') && preview ? (
                                        <img src={preview} alt="Upload preview" className="max-h-full object-contain" />
                                    ) : (
                                        <div className="flex flex-col items-center">
                                            <FileImage className="h-16 w-16 text-muted-foreground mb-4" />
                                            <p className="text-sm text-muted-foreground">DICOM viewer placeholder</p>
                                        </div>
                                    )}
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        className="absolute top-2 right-2 rounded-full h-8 w-8 opacity-80 hover:opacity-100"
                                        onClick={removeFile}
                                        disabled={isUploading}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>

                                <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
                                    <div className="flex items-center space-x-3 overflow-hidden">
                                        <FileImage className="h-8 w-8 text-blue-500 flex-shrink-0" />
                                        <div className="truncate">
                                            <p className="text-sm font-medium truncate">{file.name}</p>
                                            <p className="text-xs text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2 pt-2 border-t">
                                    <Label htmlFor="patientName">Patient Name or Medical ID</Label>
                                    <Input
                                        id="patientName"
                                        placeholder="e.g. John Doe or PX-10294"
                                        value={patientName}
                                        onChange={(e) => setPatientName(e.target.value)}
                                        className="bg-background"
                                        autoComplete="off"
                                    />
                                    <p className="text-xs text-muted-foreground">We strongly recommend securing the patient's identity prior to running the AI.</p>
                                </div>
                            </div>
                        )}

                        {isUploading && (
                            <div className="mt-6 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground flex items-center">
                                        <Activity className="h-4 w-4 mr-2 animate-pulse text-blue-500" />
                                        Analyzing radiograph...
                                    </span>
                                    <span className="font-medium">{progress}%</span>
                                </div>
                                <Progress value={progress} className="h-2" />
                            </div>
                        )}

                        <Alert className="mt-6 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Notice</AlertTitle>
                            <AlertDescription>
                                This tool is for demonstration purposes. Do not use for real clinical diagnosis.
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2 border-t pt-6">
                        <Button variant="outline" onClick={removeFile} disabled={!file || isUploading}>
                            Cancel
                        </Button>
                        <Button onClick={handleAnalyze} disabled={!file || isUploading} className="min-w-[120px]">
                            {isUploading ? "Processing..." : "Run Analysis"}
                        </Button>
                    </CardFooter>
                </Card>

                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Scans</CardTitle>
                            <CardDescription>Your latest uploads</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm text-center py-8 text-muted-foreground">
                                No recent scans available.
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
