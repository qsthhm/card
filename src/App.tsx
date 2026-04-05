/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';

const CHARS = "0123456789ABCDEF<>[]{}/\\|?!@#$%^&*+=-_~".split("");
const ROWS = 18;
const COLS = 40;
const BRAND_TEXT = "ZICO DESIGN";
const COLOR_WAVE_PEAK = "#818CF8"; // Sophisticated Indigo
const COLOR_DARKEST = "#050508"; // Deep Obsidian
const COLOR_RANDOM = "#E0E7FF"; // Ice Blue / Amethyst Tint

// Helper to interpolate between two hex colors
const interpolateColor = (c1: string, c2: string, factor: number) => {
  const r1 = parseInt(c1.substring(1, 3), 16);
  const g1 = parseInt(c1.substring(3, 5), 16);
  const b1 = parseInt(c1.substring(5, 7), 16);
  const r2 = parseInt(c2.substring(1, 3), 16);
  const g2 = parseInt(c2.substring(3, 5), 16);
  const b2 = parseInt(c2.substring(5, 7), 16);
  const r = Math.round(r1 + factor * (r2 - r1));
  const g = Math.round(g1 + factor * (g2 - g1));
  const b = Math.round(b1 + factor * (b2 - b1));
  return `rgb(${r}, ${g}, ${b})`;
};

// Easing function for reveal: starts slow, accelerates in the middle, slows at end
const easeInOutCubic = (t: number) => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

export default function App() {
  const [grid, setGrid] = useState<string[][]>([]);
  const [time, setTime] = useState(0);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState<{ x: number, y: number } | null>(null);
  
  // Animation States
  const [isRevealed, setIsRevealed] = useState(false);
  const [revealProgress, setRevealProgress] = useState(0); 
  const [isRevealing, setIsRevealing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [restoreCenter, setRestoreCenter] = useState({ x: 0, y: 0 });

  // Edge Sweep State
  const [isEdgeSweeping, setIsEdgeSweeping] = useState(false);
  const [edgeSweepProgress, setEdgeSweepProgress] = useState(0);
  const [showEdgeSpark, setShowEdgeSpark] = useState(false);

  // Raw reveal progress (0-100 linear), separate from eased display progress
  const rawRevealRef = useRef(0);

  const isRevealingRef = useRef(false);
  const isRevealedRef = useRef(false);
  const isRestoringRef = useRef(false);
  const isEdgeSweepingRef = useRef(false);
  const sweepWaitRef = useRef<number | null>(null);

  const cardRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>(null);
  const lastUpdateRef = useRef<number>(0);

  // Generate persistent particles for reveal beam
  const revealParticles = useMemo(() => 
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      yOffset: Math.random() * 100,
      xDrift: (Math.random() - 0.5) * 80,
      size: Math.random() * 3 + 1,
      speed: Math.random() * 2 + 0.8,
      delay: Math.random() * 1.5,
      color: Math.random() > 0.6 ? '#818CF8' : Math.random() > 0.4 ? '#C084FC' : '#fff',
      opacity: Math.random() * 0.6 + 0.3,
    })), []);

  // Glitch fragments for the reveal edge
  const glitchFragments = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      y: Math.random() * 100,
      height: Math.random() * 4 + 1,
      offset: Math.random() * 20 + 5,
      speed: Math.random() * 0.5 + 0.3,
    })), []);

  // Persistent noise for organic texture
  const cellNoise = useMemo(() => 
    Array.from({ length: ROWS }, () => 
      Array.from({ length: COLS }, () => Math.random())
    ), []);

  const brandRow = Math.floor(ROWS / 2);
  const brandStartCol = Math.floor((COLS - BRAND_TEXT.length) / 2);

  useEffect(() => {
    const initialGrid = Array.from({ length: ROWS }, (_, r) =>
      Array.from({ length: COLS }, (_, c) => {
        if (r === brandRow && c >= brandStartCol && c < brandStartCol + BRAND_TEXT.length) {
          return BRAND_TEXT[c - brandStartCol];
        }
        return CHARS[Math.floor(Math.random() * CHARS.length)];
      })
    );
    setGrid(initialGrid);
  }, []);

  const animate = (t: number) => {
    setTime(prev => prev + 0.02);

    // Edge Sweep Delay Logic
    if (sweepWaitRef.current !== null) {
      if (t - sweepWaitRef.current > 500) {
        sweepWaitRef.current = null;
        isEdgeSweepingRef.current = true;
        setIsEdgeSweeping(true);
        setEdgeSweepProgress(0);
        setShowEdgeSpark(true);
      }
    }

    // Edge Sweep Logic
    if (isEdgeSweepingRef.current) {
      setEdgeSweepProgress(prev => {
        if (prev >= 100) {
          isEdgeSweepingRef.current = false;
          setIsEdgeSweeping(false);
          setShowEdgeSpark(false);
          return 100;
        }
        const progress = prev / 100;
        const speedMultiplier = 1 + Math.sin(progress * Math.PI) * 0.8;
        return prev + 1.2 * speedMultiplier;
      });
    }

    if (t - lastUpdateRef.current > 50) {
      // Reveal Logic with easing
      if (isRevealingRef.current) {
        rawRevealRef.current = Math.min(rawRevealRef.current + 3.5, 100);
        const easedProgress = easeInOutCubic(rawRevealRef.current / 100) * 100;
        setRevealProgress(easedProgress);
        
        if (rawRevealRef.current >= 100) {
          isRevealingRef.current = false;
          isRevealedRef.current = true;
          setIsRevealing(false);
          setIsRevealed(true);
          sweepWaitRef.current = performance.now();
        }
      }

      // Restore Logic
      if (isRestoringRef.current) {
        setRestoreProgress(prev => {
          if (prev >= 100) {
            isRestoringRef.current = false;
            isRevealedRef.current = false;
            setIsRestoring(false);
            setIsRevealed(false);
            setRevealProgress(0);
            rawRevealRef.current = 0;
            sweepWaitRef.current = performance.now();
            return 100;
          }
          return prev + 3.0;
        });
      }

      setGrid(prevGrid => {
        if (prevGrid.length === 0) return prevGrid;
        const newGrid = prevGrid.map(row => [...row]);
        
        // During reveal, increase matrix activity near the beam
        const isActiveReveal = isRevealingRef.current;
        const totalChanges = isActiveReveal 
          ? 20 
          : (Math.random() > 0.95 ? 30 : 5);
        
        for (let i = 0; i < totalChanges; i++) {
          const r = Math.floor(Math.random() * ROWS);
          let c: number;
          if (isActiveReveal && Math.random() > 0.4) {
            // Bias changes near the reveal edge
            const edgeCol = Math.floor((1 - rawRevealRef.current / 100) * COLS);
            c = Math.max(0, Math.min(COLS - 1, edgeCol + Math.floor((Math.random() - 0.5) * 10)));
          } else {
            c = Math.floor(Math.random() * COLS);
          }
          if (r === brandRow && c >= brandStartCol && c < brandStartCol + BRAND_TEXT.length) continue;
          newGrid[r][c] = CHARS[Math.floor(Math.random() * CHARS.length)];
        }
        return newGrid;
      });

      lastUpdateRef.current = t;
    }
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });
    setRotate({ x: (rect.height / 2 - y) / 15, y: (x - rect.width / 2) / 15 });
  };

  const handleMouseLeave = () => {
    setRotate({ x: 0, y: 0 });
    setMousePos(null);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!isRevealedRef.current && !isRevealingRef.current) {
      rawRevealRef.current = 0;
      isRevealingRef.current = true;
      setIsRevealing(true);
    } else if (isRevealedRef.current && !isRestoringRef.current) {
      if (cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect();
        setRestoreCenter({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }
      isRestoringRef.current = true;
      setIsRestoring(true);
      setRestoreProgress(0);
    }
  };

  const getCharStyle = (r: number, c: number) => {
    const isBrand = r === brandRow && c >= brandStartCol && c < brandStartCol + BRAND_TEXT.length;
    const noise = cellNoise[r][c];
    
    let mouseHighlight = 0;
    if (mousePos && cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const dx = ((c + 0.5) / COLS) * rect.width - mousePos.x;
      const dy = ((r + 0.5) / ROWS) * rect.height - mousePos.y;
      const distPx = Math.sqrt(dx * dx + dy * dy);
      if (distPx < 120) mouseHighlight = Math.pow(1 - distPx / 120, 1.5);
    }

    // During reveal, boost chars near the beam edge
    let revealBoost = 0;
    if (isRevealing) {
      const edgeCol = (1 - revealProgress / 100) * COLS;
      const distFromEdge = Math.abs(c - edgeCol);
      if (distFromEdge < 5) {
        revealBoost = Math.pow(1 - distFromEdge / 5, 2);
      }
    }
    
    const waveValue = Math.sin((r + c) * 0.8 - time * 2.5);
    const waveIntensity = Math.pow((waveValue + 1) / 2, 2);
    const baseLift = 0.25;
    const contrast = baseLift + waveIntensity * 0.5;
    const waveColor = interpolateColor(COLOR_DARKEST, COLOR_WAVE_PEAK, contrast);
    
    // Reveal boost creates a bright cyan/white flash near beam
    let finalColor: string;
    if (revealBoost > 0.5) {
      finalColor = interpolateColor(waveColor, '#00FFFF', revealBoost * 0.8);
    } else if (mouseHighlight > 0.2) {
      finalColor = '#FFFFFF';
    } else if (isBrand) {
      finalColor = COLOR_RANDOM;
    } else {
      finalColor = waveColor;
    }

    return {
      color: finalColor,
      textShadow: revealBoost > 0.3 
        ? `0 0 12px #00FFFF, 0 0 4px #818CF8` 
        : (mouseHighlight > 0.2) 
          ? `0 0 10px ${COLOR_WAVE_PEAK}` 
          : (contrast > 0.7 ? `0 0 8px ${COLOR_WAVE_PEAK}` : 'none'),
      opacity: Math.min(1, 0.6 + contrast * 0.3 + mouseHighlight * 0.4 + noise * 0.1 + revealBoost * 0.4),
      fontWeight: (mouseHighlight > 0.4 || revealBoost > 0.6) ? '900' : '400',
      transform: 'none',
      zIndex: 1,
    };
  };

  return (
    <div className="relative min-h-screen bg-[#030305] flex items-center justify-center p-4 font-mono select-none overflow-hidden perspective-1000">
      {/* Scene Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(129,140,248,0.05)_0%,transparent_70%)]" />
        <div 
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage: `linear-gradient(rgba(129,140,248,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(129,140,248,0.05) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
            transform: `translateY(${time * 5 % 60}px)`,
          }}
        />
        <div className="absolute top-1/3 -left-60 w-[800px] h-[800px] bg-[#818CF8] rounded-full blur-[200px] opacity-[0.03] animate-pulse" style={{ animationDuration: '12s' }} />
        <div className="absolute bottom-1/3 -right-60 w-[800px] h-[800px] bg-[#C084FC] rounded-full blur-[200px] opacity-[0.02] animate-pulse" style={{ animationDuration: '15s', animationDelay: '3s' }} />
      </div>

      <div 
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        className={`relative w-full max-w-2xl aspect-[1.586/1] rounded-[2rem] border border-white/5 shadow-[0_0_100px_rgba(111,112,192,0.15)] overflow-hidden cursor-pointer transition-all duration-300 ease-out ${ (isRevealing || isRestoring) ? 'shadow-[0_0_120px_rgba(111,112,192,0.4)] scale-[1.01]' : '' }`}
        style={{ transform: `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)` }}
      >
        {/* Layer 1: Matrix Grid */}
        <div className="absolute inset-0 grid grid-cols-[repeat(40,minmax(0,1fr))] gap-0 leading-none text-[10px] sm:text-[13px] md:text-[16px] lg:text-[19px] tracking-tighter bg-black">
          {grid.map((row, r) => row.map((char, c) => (
            <div key={`${r}-${c}`} className="flex items-center justify-center h-full w-full" style={getCharStyle(r, c)}>{char}</div>
          )))}
        </div>

        {/* Layer 2: VISA Card UI */}
        {(!isRevealed || isRestoring) && (
          <div 
            className="absolute inset-0 bg-gradient-to-br from-[#12131A] via-[#0D0E15] to-[#08090D] flex flex-col p-10 sm:p-14 text-white/90 z-40"
            style={{
              clipPath: isRestoring 
                ? `circle(${restoreProgress * 1.5}% at ${restoreCenter.x}px ${restoreCenter.y}px)`
                : isRevealing ? `inset(0 ${revealProgress}% 0 0)` : 'none'
            }}
          >
            {/* Card Texture Overlays */}
            <div className="absolute inset-0 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-[0.1] mix-blend-overlay"></div>
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-white/5 via-transparent to-white/5 opacity-20"></div>
            <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]"></div>
            
            {/* Edge Sweep surface glow */}
            {isEdgeSweeping && (
              <div 
                className="absolute inset-0 pointer-events-none z-0 opacity-40 mix-blend-screen transition-opacity duration-500"
                style={{
                  background: `conic-gradient(from ${edgeSweepProgress * 3.6}deg at 50% 50%, 
                    transparent 0%, 
                    rgba(255, 0, 255, 0.3) 20%, 
                    rgba(0, 255, 255, 0.3) 40%, 
                    rgba(0, 255, 0, 0.2) 60%, 
                    rgba(255, 255, 0, 0.2) 80%, 
                    transparent 100%)`,
                  filter: 'blur(80px)',
                }}
              />
            )}

            {/* Top Row */}
            <div className="flex justify-between items-start mb-auto relative z-10">
              <div className="flex flex-col gap-4">
                <div className="w-14 h-10 sm:w-16 sm:h-12 bg-gradient-to-br from-[#D4AF37] via-[#F9F295] to-[#B8860B] rounded-lg sm:rounded-xl relative overflow-hidden shadow-[0_0_20px_rgba(212,175,55,0.4)] border border-white/20">
                  <div className="absolute inset-0 bg-[conic-gradient(from_0deg,#ff0000,#ffff00,#00ff00,#00ffff,#0000ff,#ff00ff,#ff0000)] opacity-40 mix-blend-overlay animate-[spin_4s_linear_infinite]"></div>
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent opacity-50 animate-pulse"></div>
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-px opacity-40">
                    {[...Array(9)].map((_, i) => <div key={i} className="border border-black/20"></div>)}
                  </div>
                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />
                </div>
                <div className="flex gap-1.5 sm:gap-2">
                  {[...Array(4)].map((_, i) => <div key={i} className="w-6 h-1 sm:w-8 sm:h-1 bg-white/15 rounded-full shadow-inner"></div>)}
                </div>
              </div>
              <div className="text-3xl sm:text-4xl font-black italic tracking-tighter text-white/90 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] select-none">VISA</div>
            </div>

            {/* Card Number */}
            <div className="text-xl sm:text-3xl md:text-4xl tracking-[0.15em] sm:tracking-[0.2em] font-medium mb-8 sm:mb-10 text-white/90 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] font-mono relative z-10 whitespace-nowrap overflow-hidden">
              0000 8888 6666 9999
            </div>

            {/* Bottom Row */}
            <div className="flex justify-between items-end relative z-10">
              <div className="flex flex-col gap-1.5 sm:gap-2">
                <span className="text-[8px] sm:text-[9px] uppercase tracking-[0.4em] sm:tracking-[0.5em] text-white/40 font-bold">Card Holder</span>
                <span className="text-base sm:text-lg md:text-xl font-medium tracking-[0.15em] sm:tracking-[0.2em] text-white/90">ZICO GUO</span>
              </div>
              <div className="flex gap-6 sm:gap-12">
                <div className="flex flex-col items-end gap-1.5 sm:gap-2">
                  <span className="text-[8px] sm:text-[9px] uppercase tracking-[0.4em] sm:tracking-[0.5em] text-white/40 font-bold">Expires</span>
                  <span className="text-base sm:text-lg md:text-xl font-medium tracking-[0.15em] sm:tracking-[0.2em] text-white/90">09/28</span>
                </div>
                <div className="flex gap-1 sm:gap-1.5 items-center opacity-40">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="w-[2px] sm:w-[3px] bg-white rounded-full shadow-sm" style={{ height: `${8 + i * 3}px` }}></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========== ENHANCED REVEAL BEAM ========== */}
        {isRevealing && (
          <div 
            className="absolute top-0 bottom-0 z-50 pointer-events-none"
            style={{ right: `${revealProgress}%`, width: '1px' }}
          >
            {/* === Core Beam Group (centered on the edge) === */}
            
            {/* 1. Ultra-wide ambient glow - the atmospheric halo */}
            <div 
              className="absolute top-[-10%] bottom-[-10%] left-1/2 -translate-x-1/2"
              style={{
                width: '200px',
                background: `radial-gradient(ellipse at center, 
                  rgba(129,140,248,0.15) 0%, 
                  rgba(192,132,252,0.08) 30%, 
                  transparent 70%)`,
                filter: 'blur(20px)',
              }}
            />

            {/* 2. Medium energy field - indigo/cyan gradient */}
            <div 
              className="absolute top-[-5%] bottom-[-5%] left-1/2 -translate-x-1/2"
              style={{
                width: '80px',
                background: `linear-gradient(180deg, 
                  transparent 0%, 
                  rgba(0,255,255,0.1) 15%,
                  rgba(129,140,248,0.25) 30%, 
                  rgba(192,132,252,0.2) 50%, 
                  rgba(129,140,248,0.25) 70%, 
                  rgba(0,255,255,0.1) 85%,
                  transparent 100%)`,
                filter: 'blur(8px)',
                opacity: 0.7 + Math.sin(time * 15) * 0.15,
              }}
            />

            {/* 3. Sharp inner beam - bright white/cyan core */}
            <div 
              className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2"
              style={{
                width: '6px',
                background: `linear-gradient(180deg, 
                  rgba(0,255,255,0.3) 0%, 
                  rgba(255,255,255,0.9) 20%, 
                  rgba(224,231,255,1) 50%, 
                  rgba(255,255,255,0.9) 80%, 
                  rgba(0,255,255,0.3) 100%)`,
                boxShadow: `0 0 15px rgba(129,140,248,0.8), 
                             0 0 30px rgba(129,140,248,0.4), 
                             0 0 60px rgba(192,132,252,0.3)`,
                filter: 'blur(0.5px)',
              }}
            />

            {/* 4. Razor-thin bright center line */}
            <div 
              className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2"
              style={{
                width: '1.5px',
                background: '#fff',
                boxShadow: '0 0 6px #fff, 0 0 2px #00FFFF',
                opacity: 0.9 + Math.sin(time * 40) * 0.1,
              }}
            />

            {/* 5. Pulsing energy rings along the beam */}
            {[0.15, 0.35, 0.55, 0.75, 0.9].map((pos, i) => (
              <div
                key={`ring-${i}`}
                className="absolute left-1/2 -translate-x-1/2"
                style={{
                  top: `${pos * 100}%`,
                  width: `${20 + Math.sin(time * 8 + i * 2) * 10}px`,
                  height: '2px',
                  background: `radial-gradient(ellipse at center, 
                    rgba(255,255,255,${0.6 + Math.sin(time * 12 + i) * 0.3}) 0%, 
                    rgba(129,140,248,0.3) 50%, 
                    transparent 100%)`,
                  filter: 'blur(0.5px)',
                }}
              />
            ))}

            {/* 6. Particles - diverse sizes, colors, and trajectories */}
            {revealParticles.map((p) => (
              <div 
                key={`p-${p.id}`}
                className="absolute rounded-full"
                style={{
                  width: `${p.size}px`,
                  height: `${p.size}px`,
                  backgroundColor: p.color,
                  top: `${p.yOffset}%`,
                  left: '50%',
                  opacity: p.opacity * (0.5 + Math.sin(time * p.speed * 5 + p.delay * 10) * 0.5),
                  boxShadow: p.size > 2 ? `0 0 ${p.size * 3}px ${p.color}` : 'none',
                  animation: `particle-float-${p.id % 4} ${p.speed}s infinite ease-in-out`,
                  animationDelay: `${p.delay}s`,
                }}
              />
            ))}

            {/* 7. Horizontal glitch fragments at the cutting edge */}
            {glitchFragments.map((g) => {
              const flicker = Math.sin(time * 20 + g.id * 7) > 0.3;
              if (!flicker) return null;
              return (
                <div
                  key={`glitch-${g.id}`}
                  className="absolute"
                  style={{
                    top: `${g.y}%`,
                    left: `${-g.offset}px`,
                    width: `${g.offset * 2}px`,
                    height: `${g.height}px`,
                    background: `linear-gradient(90deg, 
                      transparent, 
                      rgba(0,255,255,${0.2 + Math.random() * 0.3}), 
                      rgba(129,140,248,${0.3 + Math.random() * 0.2}),
                      transparent)`,
                    filter: 'blur(0.5px)',
                    opacity: 0.6,
                  }}
                />
              );
            })}

            {/* 8. Leading edge "blade" glow on the card side (left of beam) */}
            <div 
              className="absolute top-0 bottom-0"
              style={{
                right: '0',
                width: '40px',
                background: `linear-gradient(90deg, 
                  transparent 0%, 
                  rgba(129,140,248,0.08) 60%, 
                  rgba(224,231,255,0.15) 100%)`,
              }}
            />

            {/* 9. Trailing wake on the matrix side (right of beam) */}
            <div 
              className="absolute top-0 bottom-0"
              style={{
                left: '0',
                width: '60px',
                background: `linear-gradient(270deg, 
                  transparent 0%, 
                  rgba(0,255,255,0.05) 40%, 
                  rgba(129,140,248,0.1) 100%)`,
                opacity: 0.5 + Math.sin(time * 6) * 0.2,
              }}
            />

            {/* 10. Spark cluster at beam top & bottom */}
            {['-3%', '103%'].map((pos, idx) => (
              <div 
                key={`spark-${idx}`}
                className="absolute left-1/2 -translate-x-1/2"
                style={{
                  top: pos,
                  width: '30px',
                  height: '30px',
                  background: `radial-gradient(circle, 
                    rgba(255,255,255,0.8) 0%, 
                    rgba(0,255,255,0.4) 30%, 
                    transparent 70%)`,
                  filter: 'blur(3px)',
                  opacity: 0.4 + Math.sin(time * 20 + idx * 3) * 0.3,
                }}
              />
            ))}
          </div>
        )}

        {/* Restore Expansion Ring */}
        {isRestoring && (
          <div className="absolute z-50 pointer-events-none rounded-full border-2 border-white/40 shadow-[0_0_50px_rgba(255,255,255,0.5),inset_0_0_30px_rgba(255,255,255,0.3)]"
            style={{ left: restoreCenter.x, top: restoreCenter.y, width: `${restoreProgress * 3.5}%`, height: `${restoreProgress * 3.5}%`, transform: 'translate(-50%, -50%)', opacity: 1 - restoreProgress / 100 }}
          />
        )}

        {/* Edge Highlight Sweep */}
        {isEdgeSweeping && (
          <div 
            className="absolute inset-0 rounded-[2rem] pointer-events-none z-[60] overflow-hidden transition-opacity duration-500"
            style={{ 
              opacity: edgeSweepProgress < 15 
                ? edgeSweepProgress / 15 
                : edgeSweepProgress > 85 
                  ? (100 - edgeSweepProgress) / 15 
                  : 1 
            }}
          >
            {showEdgeSpark && edgeSweepProgress < 10 && (
              <div 
                className="absolute inset-0 rounded-[2rem] border-[2px] border-white/30 blur-[8px] animate-pulse"
                style={{ opacity: (1 - edgeSweepProgress / 10) * 0.5 }}
              />
            )}
            <div 
              className="absolute inset-0 rounded-[2rem] border-[0.5px] border-transparent"
              style={{
                background: `conic-gradient(from ${edgeSweepProgress * 3.6}deg, transparent 92%, #fff 97%, #fff 99.5%, transparent 100%) border-box`,
                WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
                WebkitMaskComposite: 'destination-out',
                maskComposite: 'exclude',
                opacity: 0.5 + Math.sin(time * 60) * 0.1, 
              }}
            />
            <div 
              className="absolute inset-0 rounded-[2rem] border-[1.2px] border-transparent blur-[1.5px] opacity-60 mix-blend-screen"
              style={{
                background: `conic-gradient(from ${edgeSweepProgress * 3.6}deg, 
                  transparent 65%, 
                  #C084FC 80%, 
                  #818CF8 90%, 
                  #E0E7FF 95%,
                  #fff 98%, 
                  transparent 100%) border-box`,
                WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
                WebkitMaskComposite: 'destination-out',
                maskComposite: 'exclude',
              }}
            />
            <div 
              className="absolute inset-[-20px] rounded-[3rem] blur-[30px] opacity-15 mix-blend-screen"
              style={{
                background: `conic-gradient(from ${edgeSweepProgress * 3.6}deg, 
                  transparent 75%, 
                  rgba(192, 132, 252, 0.2) 85%, 
                  rgba(129, 140, 248, 0.2) 92%, 
                  transparent 100%)`,
                transform: `scale(${1 + Math.sin(time * 10) * 0.02})`,
              }}
            />
            <div 
              className="absolute inset-0 rounded-[2rem] border-[0.3px] border-transparent opacity-20"
              style={{
                background: `conic-gradient(from ${edgeSweepProgress * 3.6 - 15}deg, 
                  transparent 55%, 
                  #00FFFF 85%, 
                  transparent 99%) border-box`,
                WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
                WebkitMaskComposite: 'destination-out',
                maskComposite: 'exclude',
              }}
            />
          </div>
        )}

        {/* Global CRT Effects */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.01),rgba(0,255,0,0.005),rgba(0,0,255,0.01))] bg-[length:100%_3px,3px_100%] opacity-30"></div>
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,0.8)]"></div>
        <div 
          className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-white/5 to-transparent h-20 w-full z-[100] opacity-20"
          style={{ transform: `translateY(${(time * 100) % 1000 - 500}px)` }}
        />
      </div>

      <style>{`
        @keyframes dust-drift {
          0% { transform: translate(0, 0) scale(1); opacity: 0; }
          50% { opacity: 0.8; }
          100% { transform: translate(20px, -30px) scale(0); opacity: 0; }
        }
        @keyframes particle-float-0 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.2; }
          25% { transform: translate(-15px, -20px) scale(1.2); opacity: 0.9; }
          50% { transform: translate(10px, -35px) scale(0.8); opacity: 0.5; }
          75% { transform: translate(-8px, -15px) scale(1.1); opacity: 0.7; }
        }
        @keyframes particle-float-1 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.3; }
          30% { transform: translate(20px, -25px) scale(0.6); opacity: 0.8; }
          60% { transform: translate(-12px, -40px) scale(1.3); opacity: 0.4; }
          80% { transform: translate(5px, -10px) scale(0.9); opacity: 0.9; }
        }
        @keyframes particle-float-2 {
          0%, 100% { transform: translate(0, 0) scale(0.8); opacity: 0.4; }
          20% { transform: translate(-25px, -15px) scale(1.4); opacity: 0.7; }
          50% { transform: translate(15px, -30px) scale(0.5); opacity: 0.9; }
          70% { transform: translate(-5px, -20px) scale(1.1); opacity: 0.3; }
        }
        @keyframes particle-float-3 {
          0%, 100% { transform: translate(0, 5px) scale(1); opacity: 0.2; }
          35% { transform: translate(12px, -30px) scale(1.5); opacity: 0.6; }
          55% { transform: translate(-18px, -20px) scale(0.7); opacity: 0.8; }
          85% { transform: translate(8px, -8px) scale(1.2); opacity: 0.5; }
        }
        .perspective-1000 { perspective: 1000px; }
        ::-webkit-scrollbar { width: 0px; }
      `}</style>
    </div>
  );
}