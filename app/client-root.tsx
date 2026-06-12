'use client';

import { SoundProvider } from '@/lib/sound';

export function ClientRoot({ children }: { children: React.ReactNode }) {
  return <SoundProvider>{children}</SoundProvider>;
}
