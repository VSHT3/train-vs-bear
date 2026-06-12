'use client';

import { useEffect, useRef } from 'react';
import type { PlayerSide } from '@/lib/types';
import { Sprite } from './sprite';

export function TitleScreen({
  onStart,
  onHelp,
  onStats,
  onContinue,
}: {
  onStart: (side: PlayerSide) => void;
  onHelp: () => void;
  onStats: () => void;
  onContinue?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dotsRef = useRef<{ x: number; y: number; vx: number; vy: number; r: number; a: number }[]>([]);
  const frameRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    // Init floating dots
    if (dotsRef.current.length === 0) {
      for (let i = 0; i < 40; i++) {
        dotsRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          r: Math.random() * 2 + 1,
          a: Math.random() * 0.4 + 0.1,
        });
      }
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frameRef.current++;

      // Draw connections between nearby dots
      for (let i = 0; i < dotsRef.current.length; i++) {
        for (let j = i + 1; j < dotsRef.current.length; j++) {
          const dx = dotsRef.current[i].x - dotsRef.current[j].x;
          const dy = dotsRef.current[i].y - dotsRef.current[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(dotsRef.current[i].x, dotsRef.current[i].y);
            ctx.lineTo(dotsRef.current[j].x, dotsRef.current[j].y);
            ctx.strokeStyle = `rgba(100,100,100,${(1 - dist / 120) * 0.15})`;
            ctx.stroke();
          }
        }
      }

      // Update and draw dots
      for (const dot of dotsRef.current) {
        dot.x += dot.vx;
        dot.y += dot.vy;
        if (dot.x < 0) dot.x = canvas.width;
        if (dot.x > canvas.width) dot.x = 0;
        if (dot.y < 0) dot.y = canvas.height;
        if (dot.y > canvas.height) dot.y = 0;

        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(100,100,120,${dot.a})`;
        ctx.fill();
      }

      requestAnimationFrame(animate);
    };
    const raf = requestAnimationFrame(animate);

    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-8 p-8 text-center relative overflow-hidden">
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }} />

      <div className="relative z-10 w-full max-w-2xl space-y-8">
        {onContinue && (
          <button
            onClick={onContinue}
            className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 dark:from-emerald-400/10 dark:to-emerald-500/10 border border-emerald-400/30 dark:border-emerald-400/20 rounded-2xl text-emerald-700 dark:text-emerald-300 font-semibold text-sm hover:scale-[1.01] hover:bg-emerald-500/20 transition-all"
          >
            <span className="text-lg">▶️</span>
            <span>Resume saved game</span>
            <span className="text-xs text-emerald-500/70 ml-auto">Click to continue</span>
          </button>
        )}

        <div className="space-y-4">
          <div className="flex justify-center">
            <Sprite src="/sprites/title-hero.png" emoji="🚂🐻" alt="A train charging toward a bear blocking the tracks" size={256} className="rounded-3xl" />
          </div>
          <h2 className="text-5xl sm:text-7xl font-black tracking-tighter leading-tight">
            TRAIN <span className="text-zinc-400 font-light">vs</span> BEAR
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto text-lg">
            Upgrade the train or command the bears. Build your side, inspect the opposition, then let physics settle it.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 w-full max-w-xl mx-auto">
          <button
            onClick={() => onStart('train')}
            className="p-5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl font-bold text-lg hover:scale-[1.03] hover:shadow-xl transition-all active:scale-[0.98]"
          >
            <span className="block text-3xl mb-1">🚂</span>
            PLAY TRAIN
          </button>
          <button
            onClick={() => onStart('bear')}
            className="p-5 bg-amber-700 text-white rounded-2xl font-bold text-lg hover:scale-[1.03] hover:shadow-xl transition-all active:scale-[0.98]"
          >
            <span className="block text-3xl mb-1">🐻</span>
            PLAY BEAR
          </button>
        </div>

        <div className="flex items-center justify-center gap-6">
          <button onClick={onHelp} className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
            ❓ How to play
          </button>
          <button onClick={onStats} className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
            📊 Stats
          </button>
        </div>
      </div>
    </div>
  );
}
