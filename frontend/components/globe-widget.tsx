'use client';

interface GlobeWidgetProps {
  /** Visual size of the rendered globe in pixels (square). Default: 360. */
  size?: number;
  className?: string;
}

export default function GlobeWidget({ size = 360, className = '' }: GlobeWidgetProps) {
  // The globe HTML centers itself inside the iframe viewport.
  // We double the iframe size so it fills the viewport correctly, then scale it back down.
  const iframeSize = size * 2;

  return (
    <div
      className={className}
      style={{ width: size, height: size, overflow: 'hidden', flexShrink: 0 }}
      aria-hidden
    >
      <iframe
        src="/globe.html"
        title="Culture Flow Globe"
        style={{
          width: iframeSize,
          height: iframeSize,
          transform: `scale(0.5)`,
          transformOrigin: 'top left',
          border: 'none',
          pointerEvents: 'none',
        }}
        scrolling="no"
      />
    </div>
  );
}
