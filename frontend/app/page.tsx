import Twin from '@/components/twin';

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07070a] text-[#e8e4dc]">
      {/* Atmospheric layers */}
      <div
        className="pointer-events-none absolute inset-0 animate-drift opacity-90"
        style={{
          background:
            'radial-gradient(ellipse 80% 55% at 15% 20%, rgb(0 217 165 / 0.14), transparent 50%), radial-gradient(ellipse 60% 45% at 85% 75%, rgb(255 77 109 / 0.1), transparent 55%), radial-gradient(ellipse 50% 40% at 50% 100%, rgb(0 90 120 / 0.2), transparent 60%)',
        }}
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 bg-noise opacity-80" aria-hidden />
      <div
        className="pointer-events-none absolute -left-32 top-1/4 h-96 w-96 rounded-full blur-3xl"
        style={{ background: 'rgb(0 217 165 / 0.08)' }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full blur-3xl"
        style={{ background: 'rgb(255 77 109 / 0.07)' }}
        aria-hidden
      />

      {/* Diagonal mesh lines */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: `repeating-linear-gradient(
            -32deg,
            transparent,
            transparent 60px,
            rgb(232 228 220 / 0.15) 60px,
            rgb(232 228 220 / 0.15) 61px
          )`,
        }}
        aria-hidden
      />

      <div className="relative z-10 container mx-auto px-4 py-10 md:py-14">
        <div className="mx-auto max-w-4xl">
          <header className="mb-10 md:mb-12">
            <p className="font-display opacity-0-start animate-rise-fade stagger-1 mb-3 text-xs font-semibold uppercase tracking-[0.35em] text-[#00d9a5]">
              Kostya Shilkrot Production
            </p>
            <h1 className="font-display opacity-0-start animate-rise-fade stagger-2 text-4xl font-extrabold leading-[1.05] tracking-tight md:text-5xl lg:text-6xl">
              AI in{' '}
              <span
                className="animate-shimmer bg-gradient-to-r from-[#00d9a5] via-[#5ce1c8] to-[#ff4d6d] bg-clip-text text-transparent"
                style={{ backgroundSize: '200% auto' }}
              >
                Production
              </span>
            </h1>
            <p className="font-display opacity-0-start animate-rise-fade stagger-3 mt-4 max-w-xl text-lg font-medium text-[#a8a29e] md:text-xl">
              Deploy your Digital Twin to the cloud — a sharp, live companion for the course.
            </p>
          </header>

          <div className="opacity-0-start animate-rise-fade stagger-4 h-[min(620px,70vh)] min-h-[480px]">
            <Twin />
          </div>

          <footer className="mt-10 border-t border-white/[0.08] pt-8 text-center">
            <p className="text-sm text-[#78716c]">
              Building Your Digital Twin ·{' '}
              <span className="text-[#a8a29e]">structured learning, real infrastructure</span>
            </p>
          </footer>
        </div>
      </div>
    </main>
  );
}
