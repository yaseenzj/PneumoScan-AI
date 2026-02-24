import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { image } = body;

        if (!image) {
            return NextResponse.json({ error: 'No image provided' }, { status: 400 });
        }

        const scriptPath = path.join(process.cwd(), 'src', 'predict_api.py');
        const pythonProcess = spawn('python', [scriptPath]);

        type PythonOutput = { result: string; confidence: number; heatmap?: string; error?: string };

        const predictPromise = new Promise<PythonOutput>((resolve, reject) => {
            let outputData = '';
            let errorData = '';

            pythonProcess.stdout.on('data', (data) => {
                outputData += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                errorData += data.toString();
            });

            pythonProcess.on('close', (code) => {
                try {
                    // Python might print warnings, we want to extract the last valid JSON block
                    const lines = outputData.trim().split('\n');
                    const lastLine = lines[lines.length - 1];
                    const parsed = JSON.parse(lastLine) as PythonOutput;

                    if (code !== 0 || parsed.error) {
                        reject(new Error(parsed.error || errorData || 'Python script failed'));
                    } else {
                        resolve(parsed);
                    }
                } catch (e) {
                    reject(new Error(`Failed to parse Python output: ${outputData} | Err: ${errorData}`));
                }
            });

            // Pass the image via stdin
            pythonProcess.stdin.write(JSON.stringify({ image }));
            pythonProcess.stdin.end();
        });

        const pythonResult = await predictPromise;
        const mockId = Math.random().toString(36).substring(2, 9);

        const result = {
            id: mockId,
            result: pythonResult.result,
            confidence: parseFloat(pythonResult.confidence.toFixed(4)),
            image_data: image,
            heatmap: pythonResult.heatmap,
            created_at: new Date().toISOString()
        };

        return NextResponse.json(result);
    } catch (error) {
        console.error('Prediction API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
