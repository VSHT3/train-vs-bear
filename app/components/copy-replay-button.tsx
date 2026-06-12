'use client';

import { useState } from 'react';
import { createReplayPayload, encodeReplay } from '@/lib/replay';
import type { GameState } from '@/lib/types';

export function CopyReplayButton({ state, className = '' }: { state: GameState; className?: string }) {
  const [copied, setCopied] = useState(false);

  if (!state.plan) return null;

  const copyReplay = async () => {
    const url = new URL(window.location.href);
    url.pathname = '/';
    url.search = '';
    url.searchParams.set('replay', encodeReplay(createReplayPayload(state)));
    await navigator.clipboard.writeText(url.toString());
    setCopied(true);
  };

  return (
    <button onClick={copyReplay} className={className}>
      {copied ? 'Replay link copied' : 'Share replay'}
    </button>
  );
}
