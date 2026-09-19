import React from 'react';

interface JerseyIconProps {
  isGoalkeeper?: boolean;
  className?: string;
  size?: number | string;
  title?: string;
}

export const JerseyIcon: React.FC<JerseyIconProps> = ({
  isGoalkeeper = false,
  className = 'w-7 h-7',
  size,
  title
}) => {
  const defaultTitle = isGoalkeeper
    ? 'Maglia Portiere Gialla (Spes Montesacro - Mizuno)'
    : 'Maglia Gara Bianca (Spes Montesacro - Mizuno)';

  const mainColor = isGoalkeeper ? '#FACC15' : '#FFFFFF';
  const shadowColor = isGoalkeeper ? '#EAB308' : '#F1F5F9';
  const strokeColor = isGoalkeeper ? '#B45309' : '#94A3B8';
  const trimColor = isGoalkeeper ? '#1E293B' : '#047857'; // Black trim for GK, Spes green for White kit
  const textColor = isGoalkeeper ? '#1E293B' : '#047857';

  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      style={size ? { width: size, height: size } : undefined}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title || defaultTitle}
    >
      <title>{title || defaultTitle}</title>

      {/* Jersey Shadow for 3D realism */}
      <path
        d="M 36 12 L 86 24 L 98 44 L 82 54 L 76 44 L 76 92 Q 50 95 24 92 L 24 44 L 18 54 L 2 44 L 14 24 L 64 12"
        fill="rgba(0,0,0,0.12)"
        transform="translate(1, 2)"
      />

      {/* Main Jersey Body */}
      <path
        d="M 38 12 L 84 23 L 96 42 L 81 52 L 75 42 L 75 90 Q 50 93 25 90 L 25 42 L 19 52 L 4 42 L 16 23 L 62 12 Z"
        fill={mainColor}
        stroke={strokeColor}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />

      {/* Subtle side shading */}
      <path
        d="M 25 42 L 25 90 Q 36 91.5 40 91 L 38 42 Z"
        fill={shadowColor}
        opacity="0.6"
      />

      {/* Bottom Hem Trim */}
      <path
        d="M 25 87 Q 50 90 75 87 L 75 90 Q 50 93 25 90 Z"
        fill={trimColor}
      />

      {/* Sleeve Cuffs */}
      <path
        d="M 4 42 L 19 52 L 17 54 L 2 44 Z"
        fill={trimColor}
      />
      <path
        d="M 96 42 L 81 52 L 83 54 L 98 44 Z"
        fill={trimColor}
      />

      {/* V-Neck Collar */}
      <path
        d="M 38 12 Q 50 25 62 12 L 57 12 Q 50 20 43 12 Z"
        fill={trimColor}
      />
      {/* Neck inner opening */}
      <path
        d="M 41 12 Q 50 19 59 12 Q 50 15 41 12 Z"
        fill="#0F172A"
      />

      {/* LEFT CHEST: Spes Montesacro Official Logo Monogram */}
      <g id="spes-logo-chest" transform="translate(29, 32)">
        {/* Shield background */}
        <path
          d="M 1 1 Q 8 0 15 1 Q 15 11 8 16 Q 1 11 1 1 Z"
          fill={isGoalkeeper ? '#064E3B' : '#047857'}
          stroke="#F59E0B"
          strokeWidth="0.8"
        />
        {/* Spes Monogram silhouette */}
        <g transform="translate(1.5, 15) scale(0.055, -0.055)" fill="#FFFFFF">
          <path d="M1019 2080 c-104 -17 -193 -41 -282 -76 -99 -40 -182 -85 -182 -100 0 -7 171 -352 179 -361 1 -1 46 14 101 32 133 46 268 61 407 46 95 -10 203 -33 215 -45 7 -6 -309 -656 -319 -656 -4 0 -8 4 -8 9 0 8 -246 534 -256 549 -4 7 -39 -8 -62 -26 l-23 -18 173 -352 c94 -194 175 -352 178 -352 7 0 422 860 428 886 4 18 -79 56 -191 87 -70 19 -105 22 -242 21 -143 -1 -169 -3 -248 -27 -48 -15 -92 -27 -97 -27 -13 0 -102 179 -97 194 7 19 107 63 205 92 220 64 501 27 699 -92 32 -20 61 -36 65 -37 4 -1 19 17 33 40 l25 41 -30 22 c-54 39 -213 107 -300 129 -96 25 -283 35 -371 21z" />
          <path d="M1455 1004 c-170 -338 -313 -614 -316 -614 -3 0 -16 24 -29 53 -13 28 -80 169 -150 312 -69 143 -188 392 -265 552 -77 161 -142 293 -145 293 -3 0 -52 -237 -108 -526 l-103 -527 47 -48 c26 -27 49 -47 50 -46 2 2 33 180 69 397 36 217 67 400 69 405 2 6 130 -244 285 -554 l283 -564 48 94 c26 52 109 213 184 359 75 146 182 356 238 467 57 111 105 199 108 197 3 -3 28 -185 56 -405 28 -220 54 -403 58 -406 4 -4 29 16 57 44 l51 50 -62 389 c-34 214 -72 456 -85 537 -13 82 -25 150 -27 152 -1 2 -142 -273 -313 -611z" />
        </g>
      </g>

      {/* RIGHT CHEST: Mizuno RunBird Logo & Mizuno Branding */}
      <g id="mizuno-logo-chest" transform="translate(56, 33)">
        {/* Mizuno RunBird aerodynamic stylized symbol */}
        <path
          d="M 1 9 C 3 6, 7 4, 11 3 C 14 3, 16 4, 15 6 C 13 6, 9 7, 7 10 C 10 9, 14 9, 17 11 C 13 12, 8 13, 5 15 C 4 13, 2 11, 1 9 Z"
          fill={isGoalkeeper ? '#0F172A' : '#064E3B'}
        />
        <path
          d="M 5 9 C 9 6, 15 5, 17 7 C 15 8, 11 9, 8 11 Z"
          fill={isGoalkeeper ? '#0F172A' : '#047857'}
        />
        {/* Mizuno Text */}
        <text
          x="9"
          y="18"
          textAnchor="middle"
          fontSize="4.2"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, sans-serif"
          fill={textColor}
          letterSpacing="0.4"
        >
          MIZUNO
        </text>
      </g>

      {/* Center Subtle Sponsor or SPES Lettering */}
      <text
        x="50"
        y="62"
        textAnchor="middle"
        fontSize="6.5"
        fontWeight="900"
        fontFamily="system-ui, -apple-system, sans-serif"
        fill={isGoalkeeper ? '#1E293B' : '#047857'}
        letterSpacing="0.8"
      >
        SPES
      </text>
    </svg>
  );
};
