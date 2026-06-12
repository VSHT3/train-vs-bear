import { GameShell } from './components/game-shell';
import { normalizeSeed } from '@/lib/random';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ seed?: string }>;
}) {
  const { seed } = await searchParams;
  return <GameShell initialSeed={seed ? normalizeSeed(seed) : null} />;
}
