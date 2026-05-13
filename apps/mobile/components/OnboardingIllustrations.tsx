import Svg, {
  Circle, Rect, Path, Ellipse, Defs, Pattern, ClipPath, G,
} from 'react-native-svg';

interface Props { width: number; height: number }

/* ── palette ── */
const P = {
  blue:   '#5B5FC7',
  orange: '#E87C60',
  teal:   '#6DCFC8',
  olive:  '#BAC94A',
  skin:   '#D4956A',
  skinLt: '#E8B89A',
  hair:   '#1C1008',
  dots:   '#EEEEF8',
  white:  '#ffffff',
};

/* ─── Slide 1: person in browser window ─── */
export function Illustration1({ width, height }: Props) {
  return (
    <Svg width={width} height={height} viewBox="0 0 375 400" preserveAspectRatio="xMidYMid meet">
      <Rect width={375} height={400} fill={P.white} />

      <Defs>
        <Pattern id="dp1" x="0" y="0" width="11" height="11" patternUnits="userSpaceOnUse">
          <Circle cx="3" cy="3" r="2" fill={P.dots} />
        </Pattern>
        <ClipPath id="dc1"><Circle cx={188} cy={185} r={134} /></ClipPath>
      </Defs>
      {/* dotted circle */}
      <Rect x={54} y={51} width={268} height={268} fill="url(#dp1)" clipPath="url(#dc1)" />

      {/* ── browser frame ── */}
      <Rect x={92} y={68} width={191} height={180} rx={11} fill={P.white} />
      <Rect x={92} y={68} width={191} height={180} rx={11} stroke="#E0E0F0" strokeWidth={2} fill="none" />
      {/* header bar */}
      <Rect x={92} y={68} width={191} height={28} rx={11} fill="#F4F4FB" />
      <Rect x={92} y={84} width={191} height={12} fill="#F4F4FB" />
      {/* traffic dots */}
      <Circle cx={108} cy={82} r={4.5} fill="#FF6B6B" />
      <Circle cx={122} cy={82} r={4.5} fill="#FFD54F" />
      <Circle cx={136} cy={82} r={4.5} fill="#66BB6A" />

      {/* ── person (waist up, inside frame) ── */}
      {/* body */}
      <Rect x={158} y={162} width={60} height={86} rx={22} fill={P.blue} />
      {/* neck */}
      <Rect x={181} y={150} width={16} height={16} rx={5} fill={P.skin} />
      {/* head */}
      <Circle cx={189} cy={126} r={29} fill={P.skin} />
      {/* hair */}
      <Path d="M160 115 Q189 80 218 115 L218 102 Q189 67 160 102 Z" fill={P.hair} />
      {/* eyes */}
      <Circle cx={179} cy={123} r={4} fill={P.hair} />
      <Circle cx={199} cy={123} r={4} fill={P.hair} />
      {/* smile */}
      <Path d="M180 138 Q189 147 198 138" stroke={P.hair} strokeWidth={2.5} fill="none" strokeLinecap="round" />
      {/* waving left arm */}
      <Path d="M160 178 Q134 155 118 138" stroke={P.skin} strokeWidth={20} strokeLinecap="round" fill="none" />
      {/* hand */}
      <Circle cx={115} cy={133} r={13} fill={P.skin} />
      {/* right arm down */}
      <Path d="M216 178 Q234 200 238 220" stroke={P.skin} strokeWidth={20} strokeLinecap="round" fill="none" />

      {/* frame border overlay (draws on top of person body) */}
      <Rect x={92} y={68} width={191} height={180} rx={11} stroke="#E0E0F0" strokeWidth={2} fill="none" />

      {/* ── decorative elements ── */}
      {/* teal cloud puffs — bottom-left of frame */}
      <Circle cx={68} cy={256} r={20} fill={P.teal} />
      <Circle cx={87} cy={246} r={17} fill={P.teal} />
      <Circle cx={106} cy={253} r={15} fill={P.teal} />

      {/* olive ball — below cloud */}
      <Circle cx={76} cy={286} r={26} fill={P.olive} />

      {/* orange triangle — top-right */}
      <Path d="M295 85 L318 126 L272 126 Z" fill={P.orange} />

      {/* teal circle outline — left mid */}
      <Circle cx={60} cy={180} r={15} fill="none" stroke={P.teal} strokeWidth={3.5} />

      {/* orange squiggle — right side */}
      <Path d="M312 188 Q326 176 320 192 Q314 208 328 196" stroke={P.orange} strokeWidth={3.5} fill="none" strokeLinecap="round" />

      {/* plant leaves — top-left */}
      <Path d="M66 112 Q52 88 72 78 Q70 96 74 110 Z" fill={P.olive} />
      <Path d="M70 115 Q88 94 97 104 Q80 108 73 118 Z" fill={P.olive} />

      {/* small orange dots */}
      <Circle cx={268} cy={296} r={5.5} fill={P.orange} opacity={0.75} />
      <Circle cx={281} cy={305} r={4} fill={P.orange} opacity={0.55} />
    </Svg>
  );
}

/* ─── Slide 2: documents / task form ─── */
export function Illustration2({ width, height }: Props) {
  return (
    <Svg width={width} height={height} viewBox="0 0 375 400" preserveAspectRatio="xMidYMid meet">
      <Rect width={375} height={400} fill={P.white} />

      <Defs>
        <Pattern id="dp2" x="0" y="0" width="11" height="11" patternUnits="userSpaceOnUse">
          <Circle cx="3" cy="3" r="2" fill={P.dots} />
        </Pattern>
        <ClipPath id="dc2"><Circle cx={188} cy={185} r={134} /></ClipPath>
      </Defs>
      <Rect x={54} y={51} width={268} height={268} fill="url(#dp2)" clipPath="url(#dc2)" />

      {/* ── back card (teal) ── */}
      <Rect x={82} y={92} width={148} height={188} rx={10} fill={P.teal} />
      {/* window dots on teal card */}
      <Circle cx={98} cy={108} r={5} fill="rgba(255,255,255,0.7)" />
      <Circle cx={112} cy={108} r={5} fill="rgba(255,255,255,0.7)" />
      <Circle cx={126} cy={108} r={5} fill="rgba(255,255,255,0.7)" />

      {/* ── middle card (orange) ── */}
      <Rect x={108} y={78} width={148} height={188} rx={10} fill={P.orange} />
      {/* window dots on orange card */}
      <Circle cx={124} cy={94} r={5} fill="rgba(255,255,255,0.7)" />
      <Circle cx={138} cy={94} r={5} fill="rgba(255,255,255,0.7)" />
      <Circle cx={152} cy={94} r={5} fill="rgba(255,255,255,0.7)" />
      {/* content lines */}
      <Rect x={120} y={112} width={120} height={10} rx={5} fill="rgba(255,255,255,0.65)" />
      <Rect x={120} y={129} width={95} height={8} rx={4} fill="rgba(255,255,255,0.45)" />
      <Rect x={120} y={143} width={108} height={8} rx={4} fill="rgba(255,255,255,0.45)" />

      {/* ── front card (white) ── */}
      <Rect x={134} y={64} width={148} height={196} rx={10} fill={P.white} />
      <Rect x={134} y={64} width={148} height={196} rx={10} stroke="#E8E8F0" strokeWidth={1.5} fill="none" />
      {/* header bar */}
      <Rect x={134} y={64} width={148} height={26} rx={10} fill="#F4F4FB" />
      <Rect x={134} y={78} width={148} height={12} fill="#F4F4FB" />
      <Circle cx={149} cy={77} r={4} fill="#FF6B6B" />
      <Circle cx={162} cy={77} r={4} fill="#FFD54F" />
      <Circle cx={175} cy={77} r={4} fill="#66BB6A" />

      {/* checklist rows */}
      {/* row 1 */}
      <Rect x={148} y={103} width={18} height={18} rx={5} fill={P.blue} />
      <Path d="M152 112 L156 116 L164 107" stroke={P.white} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Rect x={172} y={107} width={94} height={8} rx={4} fill="#E8E8F0" />

      {/* row 2 */}
      <Rect x={148} y={129} width={18} height={18} rx={5} fill={P.blue} />
      <Path d="M152 138 L156 142 L164 133" stroke={P.white} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Rect x={172} y={133} width={78} height={8} rx={4} fill="#E8E8F0" />

      {/* row 3 */}
      <Rect x={148} y={155} width={18} height={18} rx={5} fill="#E8E8F0" />
      <Rect x={172} y={159} width={86} height={8} rx={4} fill="#E8E8F0" />

      {/* row 4 */}
      <Rect x={148} y={181} width={18} height={18} rx={5} fill="#E8E8F0" />
      <Rect x={172} y={185} width={68} height={8} rx={4} fill="#E8E8F0" />

      {/* ── pencil — right side ── */}
      <Rect x={294} y={128} width={14} height={88} rx={5} fill="#FFD54F" />
      <Path d="M294 218 L301 234 L308 218 Z" fill={P.orange} />
      <Rect x={294} y={128} width={14} height={14} rx={3} fill="#B0B0B0" />
      <Rect x={296} y={131} width={10} height={8} rx={2} fill="#E0E0E0" />

      {/* ── blue circle — top-right ── */}
      <Circle cx={310} cy={96} r={26} fill={P.blue} />
      <Circle cx={310} cy={96} r={14} fill="rgba(255,255,255,0.25)" />

      {/* ── plant — bottom-left ── */}
      <Path d="M66 282 Q52 258 72 248 Q70 266 74 280 Z" fill={P.olive} />
      <Path d="M70 285 Q88 264 98 274 Q80 278 73 288 Z" fill={P.olive} />
      <Rect x={68} y={282} width={5} height={28} rx={3} fill="#8B9E34" />

      {/* orange triangle — top-left */}
      <Path d="M72 85 L90 118 L54 118 Z" fill={P.orange} />

      {/* squiggle — right lower */}
      <Path d="M318 262 Q332 250 326 266 Q320 282 334 270" stroke={P.teal} strokeWidth={3.5} fill="none" strokeLinecap="round" />

      {/* olive dot accent */}
      <Circle cx={80} cy={240} r={7} fill={P.olive} opacity={0.7} />
    </Svg>
  );
}

/* ─── Slide 3: three person portrait circles ─── */
export function Illustration3({ width, height }: Props) {
  return (
    <Svg width={width} height={height} viewBox="0 0 375 400" preserveAspectRatio="xMidYMid meet">
      <Rect width={375} height={400} fill={P.white} />

      <Defs>
        <Pattern id="dp3" x="0" y="0" width="11" height="11" patternUnits="userSpaceOnUse">
          <Circle cx="3" cy="3" r="2" fill={P.dots} />
        </Pattern>
        <ClipPath id="dc3"><Circle cx={188} cy={185} r={134} /></ClipPath>

        {/* clip circles for each portrait */}
        <ClipPath id="p3c1"><Circle cx={240} cy={140} r={74} /></ClipPath>
        <ClipPath id="p3c2"><Circle cx={138} cy={200} r={80} /></ClipPath>
        <ClipPath id="p3c3"><Circle cx={220} cy={232} r={64} /></ClipPath>
      </Defs>
      <Rect x={54} y={51} width={268} height={268} fill="url(#dp3)" clipPath="url(#dc3)" />

      {/* ── circle 1 — top-right, teal, male with cap ── */}
      <Circle cx={240} cy={140} r={74} fill={P.teal} />
      {/* body */}
      <Ellipse cx={240} cy={198} rx={46} ry={36} fill="#4AADA7" />
      {/* head */}
      <Circle cx={240} cy={148} r={28} fill={P.skinLt} />
      {/* cap */}
      <Rect x={213} y={126} width={54} height={16} rx={8} fill={P.blue} />
      <Rect x={210} y={135} width={14} height={10} rx={4} fill={P.blue} />
      {/* eyes */}
      <Circle cx={231} cy={147} r={3.5} fill={P.hair} />
      <Circle cx={249} cy={147} r={3.5} fill={P.hair} />
      {/* smile */}
      <Path d="M232 159 Q240 166 248 159" stroke={P.hair} strokeWidth={2.2} fill="none" strokeLinecap="round" />

      {/* ── circle 2 — left, orange, female with bun ── */}
      <Circle cx={138} cy={200} r={80} fill={P.orange} />
      {/* body */}
      <Ellipse cx={138} cy={266} rx={52} ry={40} fill="#C96848" />
      {/* head */}
      <Circle cx={138} cy={204} r={30} fill={P.skin} />
      {/* bun */}
      <Circle cx={138} cy={176} r={18} fill={P.hair} />
      <Circle cx={138} cy={187} r={10} fill={P.skin} />
      {/* eyes */}
      <Circle cx={128} cy={202} r={3.5} fill={P.hair} />
      <Circle cx={148} cy={202} r={3.5} fill={P.hair} />
      {/* smile */}
      <Path d="M129 215 Q138 223 147 215" stroke={P.hair} strokeWidth={2.2} fill="none" strokeLinecap="round" />

      {/* ── circle 3 — bottom-right, olive, male ── */}
      <Circle cx={220} cy={232} r={64} fill={P.olive} />
      {/* body */}
      <Ellipse cx={220} cy={286} rx={40} ry={30} fill="#96A830" />
      {/* head */}
      <Circle cx={220} cy={234} r={26} fill={P.skinLt} />
      {/* hair short */}
      <Path d="M194 224 Q220 194 246 224 L246 212 Q220 182 194 212 Z" fill={P.hair} />
      {/* eyes */}
      <Circle cx={211} cy={232} r={3.5} fill={P.hair} />
      <Circle cx={229} cy={232} r={3.5} fill={P.hair} />
      {/* smile */}
      <Path d="M212 244 Q220 252 228 244" stroke={P.hair} strokeWidth={2.2} fill="none" strokeLinecap="round" />

      {/* ── decorative ── */}
      {/* orange triangle — left */}
      <Path d="M62 168 L82 204 L42 204 Z" fill={P.orange} />

      {/* squiggle — right */}
      <Path d="M316 156 Q330 144 324 160 Q318 176 332 164" stroke={P.blue} strokeWidth={3.5} fill="none" strokeLinecap="round" />

      {/* small teal circle outline — bottom-left */}
      <Circle cx={58} cy={270} r={14} fill="none" stroke={P.teal} strokeWidth={3.5} />

      {/* olive dot cluster — top-left */}
      <Circle cx={74} cy={106} r={7} fill={P.olive} opacity={0.75} />
      <Circle cx={88} cy={98} r={5} fill={P.olive} opacity={0.55} />

      {/* blue dot accent — bottom-right */}
      <Circle cx={306} cy={288} r={8} fill={P.blue} opacity={0.6} />
      <Circle cx={318} cy={298} r={5} fill={P.blue} opacity={0.4} />
    </Svg>
  );
}
