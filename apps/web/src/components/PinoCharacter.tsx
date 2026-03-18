'use client';

// Pino (erkek) ve Pina (kız) - SVG tabanlı, animasyonlu
// Burun boyutu XP seviyesine göre değişiyor (daha çok katkı = kısa burun = dürüst)

interface PinoProps {
  gender?: 'pino' | 'pina';
  mood?: 'happy' | 'thinking' | 'excited' | 'sad' | 'working';
  noseSize?: number; // 1-5: 1=kısa(iyi), 5=uzun(çalışmalı)
  size?: number;
  outfit?: 'casual' | 'business' | 'student' | 'creative';
  className?: string;
}

const SKIN = '#FDDBB4';
const SKIN_DARK = '#F0C080';
const WOOD = '#C8860A';
const NOSE_COLOR = '#C8860A';

export default function PinoCharacter({
  gender = 'pino',
  mood = 'happy',
  noseSize = 3,
  size = 120,
  outfit = 'casual',
  className = '',
}: PinoProps) {
  const noseLength = 8 + noseSize * 7; // 15px – 43px

  const outfitColors: Record<string, { body: string; accent: string }> = {
    casual: { body: '#6366f1', accent: '#4f46e5' },
    business: { body: '#1e293b', accent: '#334155' },
    student: { body: '#0ea5e9', accent: '#0284c7' },
    creative: { body: '#ec4899', accent: '#db2777' },
  };

  const colors = outfitColors[outfit];

  // Göz ifadeleri
  const eyes = {
    happy: { left: 'M38,42 Q41,38 44,42', right: 'M56,42 Q59,38 62,42', blink: false },
    thinking: { left: 'M38,44 Q41,44 44,44', right: 'M56,40 Q59,38 62,40', blink: false },
    excited: { left: 'M38,40 Q41,35 44,40', right: 'M56,40 Q59,35 62,40', blink: false },
    sad: { left: 'M38,44 Q41,48 44,44', right: 'M56,44 Q59,48 62,44', blink: false },
    working: { left: 'M38,43 Q41,43 44,43', right: 'M56,43 Q59,43 62,43', blink: false },
  };

  const mouth = {
    happy: 'M42,58 Q50,65 58,58',
    thinking: 'M44,58 Q50,56 56,58',
    excited: 'M40,56 Q50,68 60,56',
    sad: 'M42,62 Q50,56 58,62',
    working: 'M44,58 Q50,58 56,58',
  };

  const eye = eyes[mood];

  return (
    <svg
      width={size}
      height={size * 1.4}
      viewBox="0 0 100 140"
      className={className}
      style={{ display: 'block' }}
    >
      {/* Hat / Hair */}
      {gender === 'pino' ? (
        // Erkek: şapka
        <>
          <ellipse cx="50" cy="28" rx="22" ry="6" fill={colors.body} />
          <rect x="36" y="10" width="28" height="20" rx="4" fill={colors.body} />
          <rect x="33" y="26" width="34" height="4" rx="2" fill={colors.accent} />
        </>
      ) : (
        // Kız: saç ve fiyonk
        <>
          <ellipse cx="50" cy="22" rx="24" ry="14" fill="#8B4513" />
          <path d="M26,22 Q24,38 30,42" stroke="#8B4513" strokeWidth="8" fill="none" strokeLinecap="round" />
          <path d="M74,22 Q76,38 70,42" stroke="#8B4513" strokeWidth="8" fill="none" strokeLinecap="round" />
          {/* Fiyonk */}
          <path d="M44,14 Q50,8 56,14 Q50,20 44,14Z" fill="#ec4899" />
          <path d="M44,14 Q38,8 32,14 Q38,20 44,14Z" fill="#f472b6" />
          <circle cx="44" cy="14" r="3" fill="#db2777" />
        </>
      )}

      {/* Yüz */}
      <ellipse cx="50" cy="48" rx="22" ry="24" fill={SKIN} />

      {/* Gözler */}
      <circle cx="41" cy="44" r="5" fill="white" stroke="#d1d5db" strokeWidth="1" />
      <circle cx="59" cy="44" r="5" fill="white" stroke="#d1d5db" strokeWidth="1" />
      <circle cx="42" cy="44" r="2.5" fill="#1e293b" />
      <circle cx="60" cy="44" r="2.5" fill="#1e293b" />
      {/* Göz parıltısı */}
      <circle cx="43" cy="43" r="1" fill="white" />
      <circle cx="61" cy="43" r="1" fill="white" />
      {/* Kaşlar - mood'a göre */}
      <path d={eye.left} stroke="#8B4513" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d={eye.right} stroke="#8B4513" strokeWidth="2" fill="none" strokeLinecap="round" />

      {/* Burun - XP'e göre uzunluk */}
      <path
        d={`M50,50 L${50 + noseLength},52 L50,54 Z`}
        fill={NOSE_COLOR}
        style={{ transition: 'all 0.5s ease' }}
      />

      {/* Ağız */}
      <path d={mouth[mood]} stroke="#8B4513" strokeWidth="2.5" fill="none" strokeLinecap="round" />

      {/* Yanaklar */}
      <circle cx="32" cy="54" r="6" fill="#f87171" opacity="0.3" />
      <circle cx="68" cy="54" r="6" fill="#f87171" opacity="0.3" />

      {/* Boyun */}
      <rect x="44" y="70" width="12" height="10" rx="2" fill={SKIN_DARK} />

      {/* Vücut / Kıyafet */}
      {gender === 'pino' ? (
        <>
          {/* Gömlek */}
          <path d="M28,80 Q30,75 44,73 L50,85 L56,73 Q70,75 72,80 L74,110 Q60,115 50,115 Q40,115 26,110 Z" fill={colors.body} />
          {/* Yaka */}
          <path d="M44,73 L50,80 L56,73" stroke="white" strokeWidth="2" fill="none" />
          {/* Kol (sol) */}
          <path d="M28,80 Q20,85 22,100 Q24,108 30,106" stroke={colors.body} strokeWidth="10" fill="none" strokeLinecap="round" />
          {/* Kol (sağ) */}
          <path d="M72,80 Q80,85 78,100 Q76,108 70,106" stroke={colors.body} strokeWidth="10" fill="none" strokeLinecap="round" />
          {/* El */}
          <circle cx="26" cy="107" r="7" fill={SKIN} />
          <circle cx="74" cy="107" r="7" fill={SKIN} />
          {/* Pantolon */}
          <path d="M26,110 L30,135 L46,135 L50,120 L54,135 L70,135 L74,110 Z" fill={colors.accent} />
          {/* Ayak */}
          <ellipse cx="34" cy="136" rx="9" ry="5" fill={WOOD} />
          <ellipse cx="66" cy="136" rx="9" ry="5" fill={WOOD} />
        </>
      ) : (
        <>
          {/* Bluz */}
          <path d="M28,80 Q30,75 44,73 L50,82 L56,73 Q70,75 72,80 L72,100 Q60,104 50,104 Q40,104 28,100 Z" fill={colors.body} />
          {/* Etek */}
          <path d="M28,100 Q40,115 50,114 Q60,115 72,100 L76,130 Q60,136 50,136 Q40,136 24,130 Z" fill={colors.accent} />
          {/* Kol */}
          <path d="M28,80 Q20,85 24,100" stroke={colors.body} strokeWidth="9" fill="none" strokeLinecap="round" />
          <path d="M72,80 Q80,85 76,100" stroke={colors.body} strokeWidth="9" fill="none" strokeLinecap="round" />
          <circle cx="23" cy="101" r="7" fill={SKIN} />
          <circle cx="77" cy="101" r="7" fill={SKIN} />
          {/* Ayak */}
          <ellipse cx="38" cy="137" rx="8" ry="4" fill={WOOD} />
          <ellipse cx="62" cy="137" rx="8" ry="4" fill={WOOD} />
        </>
      )}

      {/* İş aksesuarı - outfit'e göre */}
      {outfit === 'business' && (
        // Kravat
        <path d="M48,73 L50,90 L52,73 L51,92 L50,95 L49,92 Z" fill="#ef4444" />
      )}
      {outfit === 'student' && (
        // Kitap - sağ elde
        <rect x="68" y="96" width="16" height="20" rx="2" fill="#fbbf24" />
      )}
      {outfit === 'creative' && (
        // Fırça - sol elde
        <rect x="14" y="92" width="4" height="18" rx="2" fill="#8B4513" />
      )}

      {/* XP göstergesi - burun üstünde küçük yıldız */}
      {noseSize <= 2 && (
        <text x="62" y="46" fontSize="10" fill="#fbbf24">★</text>
      )}
    </svg>
  );
}
