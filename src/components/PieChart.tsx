import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useTheme } from './ui';

export interface Slice {
  value: number;
  color: string;
}

function polar(cx: number, cy: number, r: number, angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, start: number, end: number) {
  const from = polar(cx, cy, r, end);
  const to = polar(cx, cy, r, start);
  const largeArc = end - start <= 180 ? 0 : 1;
  return `M ${from.x} ${from.y} A ${r} ${r} 0 ${largeArc} 0 ${to.x} ${to.y}`;
}

export function PieChart({
  slices,
  size = 176,
  thickness = 22,
}: {
  slices: Slice[];
  size?: number;
  thickness?: number;
}) {
  const theme = useTheme();
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const radius = (size - thickness) / 2;
  const center = size / 2;

  let cursor = 0;
  const arcs = slices
    .filter((slice) => slice.value > 0)
    .map((slice, index) => {
      const sweep = total > 0 ? (slice.value / total) * 360 : 0;
      const start = cursor;
      const end = Math.min(360, cursor + sweep);
      cursor = end;
      return (
        <Path
          key={`${slice.color}-${index}`}
          d={arcPath(center, center, radius, start, end)}
          stroke={slice.color}
          strokeWidth={thickness}
          fill="none"
          strokeLinecap="butt"
        />
      );
    });

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={theme.cardAlt}
          strokeWidth={thickness}
          fill="none"
        />
        {arcs}
      </Svg>
    </View>
  );
}
