'use client';

import { getChatUrl } from '@/lib/api-base';
import { ArrowRight, Bot, Send, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

const SUGGESTED_PROMPTS = [
    'How do you spend your free time?',
    'Your last interesting projects?',
    ];

export default function Twin() {
    const [messages, setMessages]   = useState<Message[]>([]);
    const [input, setInput]         = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId, setSessionId] = useState<string>('');
    const messagesEndRef            = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const sendMessage = async (text?: string) => {
        const messageText = (text ?? input).trim();
        if (!messageText || isLoading) return;

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
            const apiUrl = getChatUrl();
            const response = await fetch(apiUrl, {
    
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: messageText,
                    session_id: sessionId || undefined,
                }),
            });

            if (!response.ok) {
                let detail = `${response.status} ${response.statusText}`;
                const raw = await response.text();
                try {
                    const errBody = JSON.parse(raw) as {
                        detail?: string | Array<{ msg?: string }>;
                    };
                    if (typeof errBody?.detail === 'string') {
                        detail = errBody.detail;
                    } else if (Array.isArray(errBody?.detail)) {
                        detail = errBody.detail
                            .map((d) => d.msg || JSON.stringify(d))
                            .join('; ');
                    }
                } catch {
                    if (raw.trim()) detail = `${detail} — ${raw.slice(0, 500)}`;
                }
                console.error('Chat HTTP error:', detail);
                throw new Error(detail);
            }

            const data = await response.json();

            if (!sessionId) setSessionId(data.session_id);

            setMessages((prev) => [
                ...prev,
                {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: data.response ?? '(empty response)',
                    timestamp: new Date(),
                },
            ]);
        } catch (error) {
            const text = error instanceof Error ? error.message : 'Unknown error (see browser console).';
            console.error('Chat error:', error);
            setMessages((prev) => [
                ...prev,
                {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: `Sorry, something went wrong: ${text}`,
                    timestamp: new Date(),
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-[#00e5b3]/22 bg-gradient-to-b from-[#18182a]/95 to-[#0c0c16]/95 shadow-[0_0_0_1px_rgb(0_229_179/0.08),0_28px_64px_-16px_rgb(0_0_0/0.75),0_0_48px_-12px_rgb(0_229_179/0.12)] backdrop-blur-2xl">

            {/* ── Terminal chrome bar ── */}
            <div className="shrink-0 flex items-center gap-3 border-b border-[#00e5b3]/12 bg-[#0f0f1a]/90 px-4 py-3">
                {/* macOS-style traffic lights */}
                <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                </div>
                <div className="h-3.5 w-px bg-white/10" />
                <div className="flex flex-1 items-center gap-1.5">
                    <Bot className="h-3.5 w-3.5 text-[#00e5b3]" aria-hidden />
                    <span className="font-mono text-[11px] text-[#6e6a7c]">digital-twin</span>
                    <span className="font-mono text-[11px] text-[#6e6a7c]/40">·</span>
                    <span className="font-mono text-[11px] text-[#6e6a7c]">
                        {sessionId ? `session:${sessionId.slice(0, 8)}` : 'no session'}
                    </span>
                </div>
                <span
                    className="h-2 w-2 rounded-full bg-[#00e5b3]"
                    style={{ boxShadow: '0 0 7px 1px rgb(0 229 179 / 0.7)' }}
                    title="Online"
                />
            </div>

            {/* ── Messages ── */}
            <div className="flex-1 overflow-y-auto bg-[#080810]/80 p-5 space-y-5 ring-1 ring-inset ring-white/[0.04]">

                {/* Empty state */}
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                        <div className="relative mb-6">
                            <div className="animate-pulse-ring absolute inset-0 rounded-3xl bg-[#00e5b3]/15 blur-xl" />
                            <div className="relative flex h-[72px] w-[72px] items-center justify-center rounded-3xl border border-white/[0.1] bg-gradient-to-br from-[#00e5b3]/15 via-transparent to-[#7c5cfc]/15">
                                <Bot className="h-8 w-8 text-[#f0ece4]" strokeWidth={1.2} aria-hidden />
                            </div>
                        </div>
                        <p className="font-display text-[1.05rem] font-semibold text-[#f0ece4]">
                            Hey — I&apos;m Kostya Shilkrot&apos; Digital Twin
                        </p>
                        <p className="mt-2 max-w-[17rem] text-sm leading-relaxed text-[#6e6a7c]">
                            Ask anything about Me.
                        </p>

                        {/* Suggested prompts */}
                        <div className="mt-6 grid w-full max-w-sm grid-cols-1 gap-2 sm:grid-cols-2">
                            {SUGGESTED_PROMPTS.map((prompt) => (
                                <button
                                    key={prompt}
                                    type="button"
                                    onClick={() => setInput(prompt)}
                                    className="flex items-start gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2.5 text-left text-[12px] text-[#9994a8] transition-all hover:border-[#00e5b3]/25 hover:bg-[#00e5b3]/5 hover:text-[#f0ece4]"
                                >
                                    <ArrowRight className="mt-[1px] h-3 w-3 shrink-0 text-[#00e5b3]/60" aria-hidden />
                                    <span>{prompt}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Message list */}
                {messages.map((message, i) => (
                    <div
                        key={message.id}
                        className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        style={{ animation: `rise-fade 0.4s cubic-bezier(0.22, 1, 0.36, 1) ${i * 0.025}s both` }}
                    >
                        {message.role === 'assistant' && (
                            <div className="shrink-0 pt-0.5">
                                <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#00e5b3]/20 bg-[#00e5b3]/10">
                                    <Bot className="h-4 w-4 text-[#00e5b3]" aria-hidden />
                                </div>
                            </div>
                        )}

                        <div
                            className={`max-w-[min(82%,30rem)] rounded-2xl px-4 py-3 ${
                                message.role === 'user'
                                    ? 'border border-[#7c5cfc]/35 bg-gradient-to-br from-[#7c5cfc]/22 to-[#7c5cfc]/8 text-[#f0ece4] shadow-[0_4px_20px_-8px_rgb(124_92_252/0.35)]'
                                    : 'border border-[#00e5b3]/18 bg-[#1c1c2e] text-[#f0ece4] shadow-[inset_0_1px_0_rgb(255_255_255/0.06),0_4px_16px_-8px_rgb(0_229_179/0.08)]'
                            }`}
                        >
                            <p className="whitespace-pre-wrap text-[14px] leading-relaxed">
                                {message.content}
                            </p>
                            <p className={`mt-2 font-mono text-[10px] ${
                                message.role === 'user' ? 'text-[#9994a8]/60' : 'text-[#6e6a7c]'
                            }`}>
                                {message.timestamp.toLocaleTimeString()}
                            </p>
                        </div>

                        {message.role === 'user' && (
                            <div className="shrink-0 pt-0.5">
                                <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.04]">
                                    <User className="h-4 w-4 text-[#9994a8]" aria-hidden />
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                {/* Loading indicator */}
                {isLoading && (
                    <div className="flex gap-3 justify-start">
                        <div className="shrink-0 pt-0.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#00e5b3]/20 bg-[#00e5b3]/10">
                                <Bot className="h-4 w-4 text-[#00e5b3]" aria-hidden />
                            </div>
                        </div>
                        <div className="rounded-2xl border border-[#00e5b3]/18 bg-[#1c1c2e] px-5 py-4 shadow-[0_4px_16px_-8px_rgb(0_229_179/0.08)]">
                            <div className="flex items-center gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#00e5b3] animate-bounce-dot" />
                                <span className="h-1.5 w-1.5 rounded-full bg-[#00e5b3] animate-bounce-dot delay-dot-1" />
                                <span className="h-1.5 w-1.5 rounded-full bg-[#7c5cfc] animate-bounce-dot delay-dot-2" />
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* ── Input ── */}
            <div className="shrink-0 border-t border-[#00e5b3]/15 bg-[#12121f]/95 p-4 backdrop-blur-xl shadow-[inset_0_1px_0_rgb(0_229_179/0.06)]">
                <div className="flex gap-2.5">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask about Me, Agentic AI or anything else…"
                        disabled={isLoading}
                        className="font-sans min-w-0 flex-1 rounded-xl border border-[#00e5b3]/20 bg-[#1a1a2c]/95 px-4 py-3 text-[14px] text-[#f0ece4] placeholder:text-[#6e6a7c] outline-none transition-[border-color,box-shadow] focus:border-[#00e5b3]/45 focus:shadow-[0_0_0_3px_rgb(0_229_179/0.1)] disabled:opacity-50"
                    />
                    <button
                        type="button"
                        onClick={() => sendMessage()}
                        disabled={!input.trim() || isLoading}
                        aria-label="Send message"
                        className="flex shrink-0 items-center justify-center rounded-xl border border-[#00e5b3]/30 bg-[#00e5b3]/10 px-4 py-3 text-[#00e5b3] transition-all hover:bg-[#00e5b3]/20 hover:border-[#00e5b3]/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00e5b3] disabled:cursor-not-allowed disabled:opacity-30"
                    >
                        <Send className="h-5 w-5" />
                    </button>
                </div>
            </div>

        </div>
    );
}
