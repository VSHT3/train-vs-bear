import { GameShell } from './components/game-shell';
import { normalizeSeed } from '@/lib/random';
import { decodeReplay } from '@/lib/replay';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ seed?: string; replay?: string }>;
}) {
  const { seed, replay } = await searchParams;
  const decodedReplay = decodeReplay(replay);
  return (
    <GameShell
      initialSeed={seed ? normalizeSeed(seed) : null}
      initialReplay={decodedReplay}
      replayInvalid={Boolean(replay && !decodedReplay)}
    />
  );
}
