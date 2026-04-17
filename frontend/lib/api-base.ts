/**
 * Chat API URL.
 * Production: same-origin `/chat` — CloudFront routes to API Gateway (no cross-origin CORS).
 * Local: NEXT_PUBLIC_* or http://127.0.0.1:8000/chat
 */

function stripChatSuffix(raw: string): string {
    const t = raw.trim().replace(/\/$/, '');
    if (t.endsWith('/chat')) {
        return t.slice(0, -'/chat'.length).replace(/\/$/, '');
    }
    return t;
}

export function chatUrlFromBase(base: string): string {
    const b = stripChatSuffix(base);
    return `${b}/chat`;
}

/** Resolved at click time so static export always uses the page origin in production. */
export function getChatUrl(): string {
    if (typeof window === 'undefined') {
        return '';
    }
    const h = window.location.hostname;
    if (h === 'localhost' || h === '127.0.0.1') {
        const fromEnv =
            process.env.NEXT_PUBLIC_API_URL?.trim() ||
            process.env.NEXT_PUBLIC_API_ENDPOINT?.trim() ||
            '';
        if (fromEnv) {
            return chatUrlFromBase(fromEnv);
        }
        return 'http://127.0.0.1:8000/chat';
    }
    return `${window.location.origin}/chat`;
}
