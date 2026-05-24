import { StyleSheet } from 'react-native';
import Svg, { Circle, Path, Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { useWindowDimensions } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

export function AuthBackground() {
  const { width, height } = useWindowDimensions();
  const { isDark } = useTheme();

  const baseFill = isDark ? '#000000' : '#ffffff';
  const blobColor = isDark ? '#1A1A3E' : '#EAE8FF';
  const accentColor = isDark ? '#2A2A5A' : '#C8C4FF';
  const accentColor2 = isDark ? '#222250' : '#D4D0FF';

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
          <Stop offset="0%" stopColor={blobColor} stopOpacity="1" />
          <Stop offset="100%" stopColor={blobColor} stopOpacity="0" />
        </RadialGradient>
      </Defs>

      <Rect width={width} height={height} fill={baseFill} />
      <Rect width={width} height={height * 0.55} fill="url(#topBlob)" />

      <Circle cx={width + 28} cy={-28} r={110} fill={accentColor} opacity={0.38} />
      <Circle cx={-20} cy={80} r={70} fill={accentColor2} opacity={0.3} />

      <Circle cx={width - 22} cy={height * 0.28} r={10} fill={accentColor} opacity={0.45} />
      <Circle cx={width - 44} cy={height * 0.32} r={6} fill={accentColor} opacity={0.32} />
      <Circle cx={width - 14} cy={height * 0.36} r={5} fill={accentColor2} opacity={0.38} />

      <Circle cx={22} cy={height * 0.58} r={9} fill={accentColor} opacity={0.38} />
      <Circle cx={40} cy={height * 0.63} r={5} fill={accentColor2} opacity={0.3} />

      <Circle cx={width + 36} cy={height + 20} r={140} fill={blobColor} opacity={0.45} />

      <Path
        d={`M0 ${height * 0.42} Q${width * 0.25} ${height * 0.48} ${width * 0.5} ${height * 0.44} Q${width * 0.75} ${height * 0.40} ${width} ${height * 0.46} L${width} 0 L0 0 Z`}
        fill={blobColor}
        opacity={0.28}
      />
    </Svg>
  );
}
