import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { image } = body;

        if (!image) {
            return NextResponse.json({ error: 'No image provided' }, { status: 400 });
        }

        // Backend API URL from environment variables
        const apiUrl = process.env.NEXT_PUBLIC_PREDICT_API_URL || 'http://127.0.0.1:8000';

        const response = await fetch(`${apiUrl}/predict`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ image }),
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
        }

        const pythonResult = await response.json();

        // If Python pipeline sent back an error 
        if (pythonResult.error) {
            return NextResponse.json({ error: pythonResult.error }, { status: 400 });
        }

        const analysisId = crypto.randomUUID().split('-')[0];

        const result = {
            id: analysisId,
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
