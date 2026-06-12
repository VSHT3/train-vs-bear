'use client';

import Image from 'next/image';
import { useState } from 'react';

export const trainSpriteSrc = (trainId: string) => `/sprites/train-${trainId}.png`;
export const unitSpriteSrc = (unitType: string) => `/sprites/unit-${unitType}.png`;
export const modSpriteSrc = (modId: string) => `/sprites/mod-${modId}.png`;

/**
 * Renders a generated sprite image, falling back to the emoji when the
 * sprite file does not exist (assets are generated incrementally —
 * see scripts/generate-assets.mts).
 */
export function Sprite({
  src,
  emoji,
  alt,
  size = 56,
  className = '',
}: {
  src: string;
  emoji: string;
  alt: string;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        aria-hidden
        className={`inline-flex items-center justify-center shrink-0 ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.7, lineHeight: 1 }}
      >
        {emoji}
      </span>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      draggable={false}
      onError={() => setFailed(true)}
      className={`shrink-0 rounded-lg object-contain ${className}`}
    />
  );
}
