"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Bot, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/lib/supabase";
import { usePathname } from "next/navigation";

const PREDEFINED_QUESTIONS = [
    "What is the intensity of the fluid?",
    "What does consolidation indicate on an X-ray?",
    "How accurate is the AI model?",
    "Are there signs of pleural effusion?",
    "Differentiate viral vs bacterial pneumonia signs.",
    "Explain how the Grad-CAM heatmap works.",
    "What are the typical zones affected by lobar pneumonia?",
    "How should I interpret a low confidence score?",
    "What are the next steps for a patient with severe consolidation?",
    "Can you explain the silhouette sign?",
    "How does the model handle pediatric X-rays?"
];

type Message = {
    role: "user" | "assistant";
    content: string;
};

export function Chatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: "assistant", content: "Hello Doctor. I am the PneumoniaXpert assistant. How can I help you analyze a scan or answer clinical questions today?" }
    ]);
    const [scanContext, setScanContext] = useState<any>(null);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    const pathname = usePathname();

    // Check for recent scan to provide context to the chat API and fetch Doctor Name
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const fetchInitialContext = async () => {
                let docName = "Doctor";

                // 1. Fetch Doctor's Email from Auth
                try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user && user.email) {
                        const namePart = user.email.split('@')[0];
                        docName = "Dr. " + namePart.charAt(0).toUpperCase() + namePart.slice(1);
                    }
                } catch (e) { }

                // 2. Fetch Active Patient Scan
                let matchedData = null;

                // First check if we're on a specific analyze page
                const analyzeMatch = pathname?.match(/\/dashboard\/analyze\/([^\/]+)/);

                if (analyzeMatch && analyzeMatch[1]) {
                    const activeId = analyzeMatch[1];
                    // check session storage first
                    const stored = sessionStorage.getItem(`scan_${activeId}`);
                    if (stored) {
                        try {
                            matchedData = JSON.parse(stored);
                        } catch (e) { }
                    }

                    // if not in storage, fetch from DB
                    if (!matchedData) {
                        try {
                            const { data, error } = await supabase
                                .from('analyses')
                                .select('*')
                                .eq('id', activeId)
                                .single();

                            if (data && !error) {
                                matchedData = data;
                            }
                        } catch (e) { }
                    }
                } else {
                    // Fallback to whatever is in sessionStorage if not on analyze page (e.g. just uploaded)
                    const keys = Object.keys(sessionStorage);
                    const scanKey = keys.find(k => k.startsWith('scan_'));
                    if (scanKey) {
                        try {
                            matchedData = JSON.parse(sessionStorage.getItem(scanKey) || "{}");
                        } catch (e) { }
                    }
                }

                if (matchedData && matchedData.result) {
                    setScanContext(matchedData);

                    const patientTarget = matchedData.patient_id ? `${matchedData.patient_id}'s` : "a";

                    setMessages([
                        { role: "assistant", content: `Hello ${docName}. I am the PneumoniaXpert assistant. I see you are reviewing ${patientTarget} scan with a predicted result of **${matchedData.result.toUpperCase()}** (${(matchedData.confidence * 100).toFixed(1)}% confidence). How can I help you analyze this image today?` }
                    ]);
                } else {
                    setScanContext(null);
                    setMessages([
                        { role: "assistant", content: `Hello ${docName}. I am the PneumoniaXpert assistant. How can I help you analyze a scan or answer clinical questions today?` }
                    ]);
                }
            };

            fetchInitialContext();
        }
    }, [pathname]);

    // Handle input change and update predictive suggestions
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setInput(val);

        if (val.trim().length > 1) {
            const matches = PREDEFINED_QUESTIONS.filter(q =>
                q.toLowerCase().includes(val.toLowerCase()) &&
                q.toLowerCase() !== val.toLowerCase()
            );
            setSuggestions(matches.slice(0, 3));
        } else {
            setSuggestions([]);
        }
    };

    const handleSend = async (text: string) => {
        if (!text.trim()) return;

        const userMsg: Message = { role: "user", content: text };
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setSuggestions([]);
        setIsLoading(true);

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: text, context: scanContext })
            });

            if (!res.ok) throw new Error("API failed");
            const data = await res.json();

            setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: "assistant", content: "I'm having trouble connecting to my knowledge base right now. Please try again later." }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) {
        return (
            <Button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 h-14 w-14 md:bottom-8 md:right-8 md:h-16 md:w-16 rounded-full shadow-2xl z-50 transition-all hover:scale-105 print:hidden"
                size="icon"
            >
                <MessageSquare className="h-7 w-7" />
            </Button>
        );
    }

    return (
        <Card className="fixed bottom-4 right-4 left-4 sm:left-auto sm:bottom-8 sm:right-8 w-auto sm:w-[380px] shadow-2xl z-50 flex flex-col border-primary/20 h-[80vh] sm:h-[550px] print:hidden">
            <CardHeader className="bg-primary text-primary-foreground p-4 flex flex-row items-center justify-between rounded-t-xl space-y-0">
                <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5" />
                    <CardTitle className="text-base font-medium">Clinical Assistant</CardTitle>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:text-primary-foreground hover:bg-primary/90" onClick={() => setIsOpen(false)}>
                    <X className="h-5 w-5" />
                </Button>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden relative flex flex-col">
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-4 space-y-4"
                >
                    {messages.map((msg, i) => (
                        <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                            <div className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center ${msg.role === "user" ? "bg-muted" : "bg-primary/20 text-primary"}`}>
                                {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                            </div>
                            <div className={`rounded-lg p-3 text-sm max-w-[80%] ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                                {msg.content}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex gap-2 flex-row">
                            <div className="h-8 w-8 shrink-0 rounded-full flex items-center justify-center bg-primary/20 text-primary">
                                <Bot className="h-4 w-4" />
                            </div>
                            <div className="rounded-lg p-3 text-sm bg-muted flex items-center">
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                        </div>
                    )}
                </div>

                {suggestions.length > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t p-2 flex flex-col gap-1 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                        <span className="text-xs text-muted-foreground px-2 font-medium">Suggestions</span>
                        {suggestions.map((suggestion, i) => (
                            <button
                                key={i}
                                className="text-left text-sm px-3 py-1.5 hover:bg-muted rounded text-primary transition-colors text-ellipsis overflow-hidden whitespace-nowrap"
                                onClick={() => handleSend(suggestion)}
                            >
                                {suggestion}
                            </button>
                        ))}
                    </div>
                )}
            </CardContent>
            <CardFooter className="p-3 border-t bg-card rounded-b-xl z-20">
                <form
                    className="flex w-full items-center gap-2"
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSend(input);
                    }}
                >
                    <Input
                        placeholder="Ask clinical questions..."
                        value={input}
                        onChange={handleInputChange}
                        className="flex-1"
                        autoComplete="off"
                    />
                    <Button type="submit" size="icon" disabled={!input.trim() || isLoading}>
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
            </CardFooter>
        </Card>
    );
}
