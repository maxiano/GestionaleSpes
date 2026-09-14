import React from 'react';

interface ClubLogoProps {
  className?: string;
  color?: string;
  title?: string;
  style?: React.CSSProperties;
}

export const ClubLogo: React.FC<ClubLogoProps> = ({
  className = 'w-10 h-10',
  color = 'currentColor',
  title = 'Logo Spes Montesacro',
  style
}) => {
  return (
    <svg
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 600 600"
      preserveAspectRatio="xMidYMid meet"
      className={className}
      style={style}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <g fill={color} stroke="none">
        {/* Arco superiore / cappello della S */}
        <path d="M 210 148 C 245 92 355 92 390 148 L 368 174 C 342 128 258 128 232 174 Z" />

        {/* Diagonale S e innesto superiore nel monogramma */}
        <path d="M 232 174 L 260 142 L 320 190 L 300 215 Z" />
        <path d="M 390 148 L 330 220 L 308 198 L 368 174 Z" />

        {/* Gamba sinistra esterna della M */}
        <polygon points="180,325 210,140 234,144 204,325" />

        {/* Gamba destra esterna della M */}
        <polygon points="420,325 390,140 366,144 396,325" />

        {/* V centrale interna della M */}
        <polygon points="210,140 234,144 300,315 284,322" />
        <polygon points="390,140 366,144 300,315 316,322" />
        <polygon points="284,322 300,315 316,322 300,342" />

        {/* Chevron centrale di incrocio SM */}
        <polygon points="248,180 300,248 352,180 332,165 300,208 268,165" />
      </g>
    </svg>
  );
};
