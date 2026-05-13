import { StyleSheet } from 'react-native';
import Svg, { Circle, Path, Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { useWindowDimensions } from 'react-native';

export function AuthBackground() {
  const { width, height } = useWindowDimensions();

  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={StyleSheet.absoluteFillObject}
      pointerEvents="none"
    >
      <Defs>
        <RadialGradient id="topBlob" cx="50%" cy="0%" r="60%">
          <Stop offset="0%" stopColor="#EAE8FF" stopOpacity="1" />
          <Stop offset="100%" stopColor="#EAE8FF" stopOpacity="0" />
        </RadialGradient>
      </Defs>

      {/* white base */}
      <Rect width={width} height={height} fill="#ffffff" />

      {/* top radial blob */}
      <Rect width={width} height={height * 0.55} fill="url(#topBlob)" />

      {/* top-right accent circle */}
      <Circle cx={width + 28} cy={-28} r={110} fill="#C8C4FF" opacity={0.38} />

      {/* top-left small circle */}
      <Circle cx={-20} cy={80} r={70} fill="#D4D0FF" opacity={0.3} />

      {/* scattered dots — right edge mid */}
      <Circle cx={width - 22} cy={height * 0.28} r={10} fill="#C8C4FF" opacity={0.45} />
      <Circle cx={width - 44} cy={height * 0.32} r={6} fill="#C8C4FF" opacity={0.32} />
      <Circle cx={width - 14} cy={height * 0.36} r={5} fill="#D4D0FF" opacity={0.38} />

      {/* scattered dots — left edge lower */}
      <Circle cx={22} cy={height * 0.58} r={9} fill="#C8C4FF" opacity={0.38} />
      <Circle cx={40} cy={height * 0.63} r={5} fill="#D4D0FF" opacity={0.3} />

      {/* bottom-right soft blob */}
      <Circle cx={width + 36} cy={height + 20} r={140} fill="#EAE8FF" opacity={0.45} />

      {/* wave divider — top area bottom edge */}
      <Path
        d={`M0 ${height * 0.42} Q${width * 0.25} ${height * 0.48} ${width * 0.5} ${height * 0.44} Q${width * 0.75} ${height * 0.40} ${width} ${height * 0.46} L${width} 0 L0 0 Z`}
        fill="#EAE8FF"
        opacity={0.28}
      />
    </Svg>
  );
}
