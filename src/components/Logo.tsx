import React from 'react';
import Svg, { Circle, Defs, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

export function Logo({ size = 72, withBackground = true }: { size?: number; withBackground?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 1024 1024">
      <Defs>
        <LinearGradient id="logoBg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#0B6B63" />
          <Stop offset="0.55" stopColor="#0E8C80" />
          <Stop offset="1" stopColor="#16B89C" />
        </LinearGradient>
        <RadialGradient id="logoGlow" cx="20%" cy="12%" r="80%">
          <Stop offset="0" stopColor="#ffffff" stopOpacity={0.26} />
          <Stop offset="1" stopColor="#ffffff" stopOpacity={0} />
        </RadialGradient>
      </Defs>

      {withBackground ? (
        <>
          <Rect width="1024" height="1024" rx="0" fill="url(#logoBg)" />
          <Circle cx="960" cy="1010" r="300" fill="#ffffff" fillOpacity={0.06} />
          <Rect width="1024" height="1024" fill="url(#logoGlow)" />
        </>
      ) : null}

      <G>
        <Rect x="196" y="318" width="632" height="392" rx="96" fill="#ffffff" />
        <Path
          d="M196 414 L196 406 A88 88 0 0 1 284 318 L740 318 A88 88 0 0 1 828 406 L828 414 Z"
          fill="#0F766E"
          fillOpacity={0.14}
        />
        <Rect x="300" y="498" width="46" height="84" rx="23" fill="#0F766E" fillOpacity={0.22} />
        <Rect x="382" y="474" width="46" height="108" rx="23" fill="#0F766E" fillOpacity={0.34} />
        <Rect x="464" y="450" width="46" height="132" rx="23" fill="#0F766E" fillOpacity={0.48} />
        <Circle cx="836" cy="514" r="62" fill="#F6B53F" />
        <Circle cx="836" cy="514" r="30" fill="#ffffff" fillOpacity={0.9} />
        <Circle cx="836" cy="514" r="18" fill="#F6B53F" />
      </G>
    </Svg>
  );
}
