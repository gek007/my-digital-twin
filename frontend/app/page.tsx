import Twin from '@/components/twin';
import { Bot, Layers, Zap } from 'lucide-react';

const TECH_STACK = [
  { label: 'Next.js 16', color: '#f0ece4' },
  { label: 'FastAPI',    color: '#00e5b3' },
  { label: 'Bedrock',    color: '#7c5cfc' },
  { label: 'Lambda',     color: '#ff4d6d' },
  { label: 'boto3',      color: '#ff4d6d' },
  { label: 'Mangum',     color: '#00e5b3' },
];

const STATUS_ROWS = [
  { label: 'Model',   value: 'Nova 2 Lite',  color: '#00e5b3', dot: false },
  { label: 'Backend', value: 'Online',  color: '#00e5b3', dot: true  },
  { label: 'Memory',  value: 'Session', color: '#7c5cfc', dot: false },
  { label: 'Runtime', value: 'Lambda',  color: '#ff4d6d', dot: false },
];

export default function Home() {
  return (
    <div className="relative bg-[#070709] text-[#f0ece4] min-h-screen">

      {/* ── Atmospheric background (fixed so it doesn't scroll) ── */}
      <div className="pointer-events-none fixed inset-0 bg-dot-grid"    aria-hidden />
      <div className="pointer-events-none fixed inset-0 bg-noise opacity-70" aria-hidden />
      <div
        className="pointer-events-none fixed inset-0 animate-drift"
        style={{
          background: [
            'radial-gradient(ellipse 80% 60% at 10% 10%, rgb(0 229 179 / 0.09), transparent 55%)',
            'radial-gradient(ellipse 60% 50% at 90% 85%, rgb(255 77 109 / 0.07), transparent 55%)',
            'radial-gradient(ellipse 50% 55% at 55% 50%, rgb(124 92 252 / 0.06), transparent 60%)',
          ].join(', '),
        }}
        aria-hidden
      />

      {/* ── Two-column layout ── */}
      <div className="relative z-10 flex min-h-screen">

        {/* ──────── Sidebar (desktop only) ──────── */}
        <aside className="hidden lg:flex flex-col w-[288px] shrink-0 sticky top-0 h-screen overflow-y-auto border-r border-white/[0.06] bg-[#0d0d15]/75 backdrop-blur-2xl">

          {/* Brand strip */}
          <div className="flex items-center gap-2.5 border-b border-white/[0.06] px-6 py-[17px]">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#00e5b3]/30 bg-[#00e5b3]/10">
              <Zap className="h-3.5 w-3.5 text-[#00e5b3]" />
            </div>
            <span className="font-mono text-[11px] font-medium tracking-[0.18em] uppercase text-[#6e6a7c]">
              Digital Twin
            </span>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-5 py-8 space-y-8">

            {/* Identity card */}
            <div className="opacity-0-start animate-rise-fade stagger-1 flex flex-col items-center text-center">
              <div className="relative mb-5">
                <div className="animate-pulse-ring absolute inset-0 rounded-[1.25rem] bg-[#00e5b3]/15 blur-xl" />
                <div className="relative h-[78px] w-[78px] rounded-[1.25rem] border border-white/[0.1] bg-gradient-to-br from-[#00e5b3]/15 via-[#0d0d15] to-[#7c5cfc]/15 flex items-center justify-center">
                  <Bot className="h-9 w-9 text-[#f0ece4]" strokeWidth={1.2} />
                </div>
                <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-[2.5px] border-[#0d0d15] bg-[#00e5b3] animate-glow-pulse" />
              </div>
              <h2 className="font-display text-[1.1rem] font-bold leading-tight text-[#f0ece4]">
                Kostya Shilkrot
              </h2>
              <p className="mt-1 font-mono text-[10px] text-[#6e6a7c]">AI Course Instructor</p>
            </div>

            {/* Status panel */}
            <div className="opacity-0-start animate-rise-fade stagger-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
              <p className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-[#6e6a7c] mb-4">
                System Status
              </p>
              <div className="space-y-2.5">
                {STATUS_ROWS.map(({ label, value, color, dot }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-[13px] text-[#6e6a7c]">{label}</span>
                    <div className="flex items-center gap-1.5">
                      {dot && (
                        <span className="h-1.5 w-1.5 rounded-full bg-[#00e5b3]" />
                      )}
                      <span className="font-mono text-[11px]" style={{ color }}>{value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tech stack */}
            <div className="opacity-0-start animate-rise-fade stagger-3 space-y-3">
              <p className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-[#6e6a7c]">Stack</p>
              <div className="flex flex-wrap gap-1.5">
                {TECH_STACK.map(({ label, color }) => (
                  <span
                    key={label}
                    className="rounded-lg border border-white/[0.07] bg-white/[0.025] px-2.5 py-1 font-mono text-[11px]"
                    style={{ color }}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>

          </div>

          {/* Sidebar footer */}
          <div className="border-t border-white/[0.06] px-5 py-4 flex items-center gap-2">
            <Layers className="h-3.5 w-3.5 shrink-0 text-[#6e6a7c]" />
            <p className="font-mono text-[10px] text-[#6e6a7c]">AI in AWS Bedrock Production · Week 2</p>
          </div>
        </aside>

        {/* ──────── Main content ──────── */}
        <main className="flex flex-1 flex-col min-h-screen">

          {/* Top bar */}
          <header className="shrink-0 flex items-center justify-between border-b border-white/[0.06] bg-[#070709]/60 px-6 py-[14px] backdrop-blur-xl lg:px-8">
            {/* Mobile brand */}
            <div className="flex items-center gap-2.5 lg:hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#00e5b3]/30 bg-[#00e5b3]/10">
                <Bot className="h-4 w-4 text-[#00e5b3]" />
              </div>
              <span className="font-display text-sm font-semibold">Digital Twin</span>
            </div>
            {/* Desktop breadcrumb */}
            <div className="hidden lg:flex items-center gap-1.5">
              <span className="font-mono text-xs text-[#6e6a7c]">Console</span>
              <span className="font-mono text-xs text-[#6e6a7c]/40">/</span>
              <span className="font-mono text-xs text-[#f0ece4]">Chat</span>
            </div>
            {/* Live indicator */}
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#00e5b3] shadow-[0_0_6px_#00e5b3]" />
              <span className="font-mono text-[11px] text-[#6e6a7c]">live</span>
            </div>
          </header>

          {/* Hero */}
          <div className="shrink-0 px-6 pt-9 pb-7 lg:px-10">
            <p className="opacity-0-start animate-rise-fade stagger-1 font-mono text-[11px] uppercase tracking-[0.3em] text-[#00e5b3] mb-3">
              Kostya Shilkrot Production
            </p>
            <h1 className="opacity-0-start animate-rise-fade stagger-2 font-display text-3xl font-extrabold leading-[1.08] md:text-4xl xl:text-[2.75rem]">
              AI in AWS Bedrock{' '}
              <span
                className="animate-shimmer bg-gradient-to-r from-[#00e5b3] via-[#7c5cfc] to-[#ff4d6d] bg-clip-text text-transparent"
                style={{ backgroundSize: '200% auto' }}
              >
                Production
              </span>
            </h1>
            <p className="opacity-0-start animate-rise-fade stagger-3 mt-3 max-w-lg text-sm text-[#6e6a7c] lg:text-[15px]">
              Deploy your Digital Twin to the cloud — a live AI companion.
            </p>
          </div>

          {/* Chat widget — inset from the right (10cm on large screens) */}
          <div className="flex-1 px-6 pb-8 lg:px-10 lg:pb-10">
            <div className="opacity-0-start animate-rise-fade stagger-4 mr-6 h-[min(600px,62vh)] min-h-[440px] lg:mr-[10cm]">
              <Twin />
            </div>
          </div>

          {/* Footer */}
          <footer className="shrink-0 border-t border-white/[0.06] px-6 py-4 lg:px-10">
            <p className="font-mono text-[11px] text-[#6e6a7c]">
              Building Your Digital Twin ·{' '}
              <span className="text-[#9994a8]">real infrastructure, live deployment</span>
            </p>
          </footer>
        </main>

      </div>
    </div>
  );
}
