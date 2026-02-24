import { NextResponse } from 'next/server';

const KNOWLEDGE_BASE: Record<string, string> = {
    "intensity": "Fluid intensity in pleural effusion typically presents as a diffuse increase in opacity. Dense homogenous opacities with a meniscus sign are classic. Low intensity (transudative) versus high intensity (exudative) fluid requires ultrasound or a fluid tap for definitive differentiation.",
    "fluid": "Fluid accumulation in the lungs often refers to pleural effusion or pulmonary edema. On an X-Ray, it typically obscures the costophrenic angles and presents as a homogenous radiopacity at the dependent portions of the thorax.",
    "consolidation": "Consolidation occurs when air in the small airways is replaced by something else, typically fluid, pus, blood, or cells (like in pneumonia). It appears as a white area on an X-ray (radiopacity). It classicly obscures blood vessels but preserves air bronchograms.",
    "accurate": "The PneumoniaXpert model is currently fine-tuned on the RSNA Pneumonia dataset, boasting an accuracy of ~89% with high sensitivity for lobar consolidation. It should always be used as an assistant to a radiologist, not a replacement.",
    "effusion": "Pleural effusion is identified by blunting of the costophrenic angles on a PA/AP view. In severe cases, it can cause a massive homogenous opacity that shifts the mediastinum away from the affected side.",
    "viral": "Viral pneumonia often presents with bilateral, diffuse, interstitial infiltrates, sometimes described as a 'ground-glass' appearance. It is less likely to cause dense, lobar consolidation compared to bacterial pneumonia.",
    "bacterial": "Bacterial pneumonia classicly presents with dense, unilateral lobar consolidation with air bronchograms. Common culprits include Streptococcus pneumoniae and Haemophilus influenzae.",
    "grad-cam": "Grad-CAM (Gradient-weighted Class Activation Mapping) uses the gradients of the target concept in the final convolutional layer to produce a coarse localization map. Red/Yellow zones indicate regions with the highest activating pixels (features) that convinced the AI of pneumonia.",
    "lobar": "Lobar pneumonia typically affects a single continuous zone (lobe) of the lung. The Right Middle Lobe is common, often obscuring the right heart border (silhouette sign).",
    "confidence": "A low confidence score (e.g., <.60) means the AI sees conflicting features. For example, mild interstitial markings that aren't dense enough to be clear consolidation but aren't entirely clear either. Manual review is highly recommended.",
    "severe": "For a patient with severe consolidation, the next steps typically include initiating empiric broad-spectrum antibiotics, supplemental oxygen if hypoxic, and potentially a CT scan if there is concern for complications like abscess or empyema.",
    "silhouette": "The silhouette sign occurs when two structures of the same radiodensity (like heart and fluid) touch, causing the normal border between them to be lost. This helps localize lung opacities.",
    "pediatric": "Pediatric X-rays can be challenging due to thymus artifacts and differing anatomical proportions. Our model focuses primarily on adult RSNA training data, so pediatric scans should be read with enhanced expert caution.",
    "hello": "Hello Doctor! I am ready to assist with clinical interpretations, AI methodology explanations, and X-ray feature identification. What would you like to know?",
    "hi": "Hi there! How can I assist you with clinical analysis today?",
};

export async function POST(req: Request) {
    try {
        const { message, context } = await req.json();
        const userInput = message.toLowerCase();

        // Find the best matching response based on keywords
        let bestMatch = "";
        let highestKeywords = 0;

        for (const [key, response] of Object.entries(KNOWLEDGE_BASE)) {
            // Count how many parts of the key exist in the user input
            // Our keys right now are single words, but this allows for multi-word keys in the future
            if (userInput.includes(key)) {
                bestMatch = response;
                break; // Taking the first matching keyword for simplicity
            }
        }

        // Default fallback if the AI isn't specifically trained on the query
        if (!bestMatch) {
            if (context && context.result) {
                bestMatch = `Based on the active scan diagnosing **${context.result.toUpperCase()}** with ${(context.confidence * 100).toFixed(1)}% confidence, I recommend reviewing the highlighted heatmap regions of interest. Is there a specific radiopaque feature in this scan you would like me to explain?`;
            } else {
                bestMatch = "I am a prototype clinical assistant. I specialize in answering questions about Pneumonia prediction, fluid intensity, consolidations, Pleural Effusions, and the Grad-CAM AI architecture. Please try rephrasing your question to focus on those topics.";
            }
        }

        // Simulate a slight delay to feel like "AI generation"
        await new Promise(resolve => setTimeout(resolve, 800));

        return NextResponse.json({ reply: bestMatch });

    } catch (error) {
        console.error('Chat API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
