'use client';

import { Bot, Send, Sparkles, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export default function Twin() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId, setSessionId] = useState<string>('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const messageText = input.trim();

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: messageText,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_ENDPOINT || 'https://acpoix6w7c.execute-api.eu-west-1.amazonaws.com/chat';
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: messageText,
                    session_id: sessionId || undefined,
                }),
            });

            if (!response.ok) {
                let detail = `${response.status} ${response.statusText}`;
                try {
                    const errBody = await response.json();
                    if (typeof errBody?.detail === 'string') {
                        detail = errBody.detail;
                    } else if (Array.isArray(errBody?.detail)) {
                        detail = errBody.detail
                            .map((d: { msg?: string }) => d.msg || JSON.stringify(d))
                            .join('; ');
                    }
                } catch {
                    /* ignore JSON parse errors */
                }
                console.error('Chat HTTP error:', detail);
                throw new Error(detail);
            }

            const data = await response.json();

            if (!sessionId) {
                setSessionId(data.session_id);
            }

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.response ?? '(empty response)',
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, assistantMessage]);
        } catch (error) {
            const text =
                error instanceof Error ? error.message : 'Unknown error (see browser console).';
            console.error('Chat error:', error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `Sorry, something went wrong: ${text}`,
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.1] bg-[rgb(12_12_18/0.75)] shadow-[0_24px_80px_-20px_rgb(0_0_0/0.65)] backdrop-blur-xl">
            {/* Header */}
            <div className="relative overflow-hidden border-b border-white/[0.08] px-5 py-5">
                <div
                    className="pointer-events-none absolute inset-0 opacity-40"
                    style={{
                        background:
                            'linear-gradient(135deg, rgb(0 217 165 / 0.12) 0%, transparent 45%, rgb(255 77 109 / 0.08) 100%)',
                    }}
                    aria-hidden
                />
                <div className="relative flex items-start gap-4">
                    <div className="relative">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#00d9a5]/40 bg-[#00d9a5]/10 shadow-[0_0_20px_rgb(0_217_165/0.25)]">
                            <Bot className="h-6 w-6 text-[#00d9a5]" aria-hidden />
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#12121a] bg-[#00d9a5]" title="Online" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h2 className="font-display flex items-center gap-2 text-xl font-bold tracking-tight text-[#e8e4dc]">
                            Digital Twin
                            <Sparkles className="h-4 w-4 shrink-0 text-[#ff4d6d]" aria-hidden />
                        </h2>
                        <p className="mt-0.5 text-sm text-[#a8a29e]">Your AI course companion · ask about deployment &amp; production</p>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 space-y-4 overflow-y-auto p-4 md:p-5">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center px-4 py-8 text-center md:py-12">
                        <div className="relative mb-6">
                            <div className="animate-pulse-ring absolute inset-0 rounded-full bg-[#00d9a5]/20 blur-xl" aria-hidden />
                            <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-white/[0.12] bg-gradient-to-br from-[#00d9a5]/20 to-[#ff4d6d]/10">
                                <Bot className="h-10 w-10 text-[#e8e4dc]" strokeWidth={1.25} />
                            </div>
                        </div>
                        <p className="font-display text-lg font-semibold text-[#e8e4dc]">Hello — I&apos;m your Digital Twin</p>
                        <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#a8a29e]">
                            Ask anything about AI deployment, APIs, or the course. I respond from your cloud backend.
                        </p>
                    </div>
                )}

                {messages.map((message, i) => (
                    <div
                        key={message.id}
                        className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        style={{ animation: `rise-fade 0.45s ease ${i * 0.03}s both` }}
                    >
                        {message.role === 'assistant' && (
                            <div className="flex-shrink-0 pt-1">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#00d9a5]/30 bg-[#00d9a5]/10">
                                    <Bot className="h-4 w-4 text-[#00d9a5]" aria-hidden />
                                </div>
                            </div>
                        )}

                        <div
                            className={`max-w-[min(85%,28rem)] rounded-2xl px-4 py-3 ${
                                message.role === 'user'
                                    ? 'border border-[#ff4d6d]/25 bg-gradient-to-br from-[#ff4d6d]/20 to-[#ff4d6d]/5 text-[#fdf7f5]'
                                    : 'border border-white/[0.08] bg-[rgb(18_18_26/0.9)] text-[#e8e4dc] shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]'
                            }`}
                        >
                            <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{message.content}</p>
                            <p
                                className={`mt-2 text-[11px] font-medium uppercase tracking-wider ${
                                    message.role === 'user' ? 'text-[#fecdd3]/80' : 'text-[#78716c]'
                                }`}
                            >
                                {message.timestamp.toLocaleTimeString()}
                            </p>
                        </div>

                        {message.role === 'user' && (
                            <div className="flex-shrink-0 pt-1">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.12] bg-white/[0.06]">
                                    <User className="h-4 w-4 text-[#e8e4dc]" aria-hidden />
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                {isLoading && (
                    <div className="flex gap-3 justify-start">
                        <div className="flex-shrink-0 pt-1">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#00d9a5]/30 bg-[#00d9a5]/10">
                                <Bot className="h-4 w-4 text-[#00d9a5]" aria-hidden />
                            </div>
                        </div>
                        <div className="rounded-2xl border border-white/[0.08] bg-[rgb(18_18_26/0.9)] px-5 py-4">
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-[#00d9a5] animate-bounce-dot" />
                                <span className="h-2 w-2 rounded-full bg-[#00d9a5] animate-bounce-dot delay-dot-1" />
                                <span className="h-2 w-2 rounded-full bg-[#ff4d6d] animate-bounce-dot delay-dot-2" />
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-white/[0.08] bg-[rgb(10_10_14/0.6)] p-4 backdrop-blur-md">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Ask about deployment, APIs, or the course…"
                        className="min-w-0 flex-1 rounded-xl border border-white/[0.1] bg-[rgb(18_18_26/0.85)] px-4 py-3 text-[15px] text-[#e8e4dc] placeholder:text-[#57534e] outline-none ring-0 transition-[border-color,box-shadow] focus:border-[#00d9a5]/50 focus:shadow-[0_0_0_3px_rgb(0_217_165/0.12)]"
                        disabled={isLoading}
                    />
                    <button
                        type="button"
                        onClick={sendMessage}
                        disabled={!input.trim() || isLoading}
                        className="flex shrink-0 items-center justify-center rounded-xl border border-[#00d9a5]/40 bg-[#00d9a5]/15 px-4 py-3 text-[#00d9a5] transition hover:bg-[#00d9a5]/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00d9a5] disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Send message"
                    >
                        <Send className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
