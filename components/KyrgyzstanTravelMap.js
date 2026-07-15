import React, { useMemo } from "react";
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  LinearGradient,
  Path,
  Polygon,
  Polyline,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";

const WIDTH = 900;
const HEIGHT = 480;
const KG_POINTS = "164.6,150.0 181.0,109.7 229.2,96.7 349.5,128.4 360.9,74.1 402.5,55.0 506.7,93.7 533.3,83.6 654.6,86.1 763.2,95.7 799.9,128.8 845.0,142.3 834.7,163.1 719.4,213.0 693.3,249.5 599.4,260.5 571.8,319.3 494.3,306.9 443.7,324.9 373.9,368.4 384.0,390.0 363.1,411.0 224.8,425.0 134.3,395.1 55.0,402.2 61.9,349.2 141.6,364.6 168.4,336.2 224.0,345.2 317.8,278.9 231.0,230.4 178.9,253.4 124.9,218.7 186.3,159.1 164.6,150.0";

const BOUNDS = {
  minLatitude: 39.1,
  maxLatitude: 43.35,
  minLongitude: 69.15,
  maxLongitude: 80.35,
};

export default function KyrgyzstanTravelMap({ checkins = [], exploredKm2 = 0, style }) {
  const points = useMemo(
    () => checkins
      .map((item) => projectCoordinate(item?.latitude, item?.longitude))
      .filter(Boolean)
      .slice(-36),
    [checkins]
  );

  const route = points.map((point) => `${point.x},${point.y}`).join(" ");
  const exploredOpacity = Math.min(0.24, 0.055 + Math.max(0, Number(exploredKm2 || 0)) / 360);

  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={style}>
      <Defs>
        <LinearGradient id="mapBg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#071b1c" />
          <Stop offset="1" stopColor="#020f11" />
        </LinearGradient>
        <LinearGradient id="countryFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#9be74f" stopOpacity={0.36} />
          <Stop offset="1" stopColor="#3f702b" stopOpacity={0.16} />
        </LinearGradient>
        <RadialGradient id="visitedGlow" cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0" stopColor="#d9ff91" stopOpacity={0.95} />
          <Stop offset="0.3" stopColor="#aaf354" stopOpacity={0.62} />
          <Stop offset="1" stopColor="#79c83d" stopOpacity={0} />
        </RadialGradient>
        <ClipPath id="kgClip">
          <Polygon points={KG_POINTS} />
        </ClipPath>
      </Defs>

      <Rect width={WIDTH} height={HEIGHT} rx={34} fill="url(#mapBg)" />
      <Path d="M20 170 C150 90 260 120 360 74 S560 90 690 44 S830 78 890 40" fill="none" stroke="#9bb2a0" strokeOpacity={0.10} strokeWidth={2} />
      <Path d="M8 330 C160 270 270 310 390 250 S590 270 700 215 S815 225 905 190" fill="none" stroke="#9bb2a0" strokeOpacity={0.08} strokeWidth={2} />
      <Path d="M170 0 C130 100 180 180 120 260 S90 400 130 480" fill="none" stroke="#9bb2a0" strokeOpacity={0.07} strokeWidth={2} />
      <Path d="M660 0 C630 90 680 160 620 250 S610 390 650 480" fill="none" stroke="#9bb2a0" strokeOpacity={0.07} strokeWidth={2} />

      <Polygon points={KG_POINTS} fill="url(#countryFill)" fillOpacity={exploredOpacity} stroke="#9de34f" strokeOpacity={0.30} strokeWidth={16} />
      <Polygon points={KG_POINTS} fill="#17301f" fillOpacity={0.78} stroke="#b9ef68" strokeOpacity={0.72} strokeWidth={3} />

      <G clipPath="url(#kgClip)">
        {points.map((point, index) => (
          <Circle
            key={`${point.x}-${point.y}-${index}`}
            cx={point.x}
            cy={point.y}
            r={index === points.length - 1 ? 88 : 62}
            fill="url(#visitedGlow)"
            opacity={index === points.length - 1 ? 0.88 : 0.48}
          />
        ))}
        {points.length > 1 ? (
          <Polyline
            points={route}
            fill="none"
            stroke="#bbf55f"
            strokeOpacity={0.78}
            strokeWidth={5}
            strokeDasharray="13 12"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
      </G>

      <Polygon points={KG_POINTS} fill="none" stroke="#d8ff8b" strokeOpacity={0.64} strokeWidth={2.4} />

      {points.map((point, index) => (
        <G key={`marker-${point.x}-${point.y}-${index}`}>
          <Circle cx={point.x} cy={point.y} r={index === points.length - 1 ? 18 : 12} fill="#b9f55b" fillOpacity={0.20} />
          <Circle cx={point.x} cy={point.y} r={index === points.length - 1 ? 7 : 5} fill="#eaffba" />
          <Circle cx={point.x} cy={point.y} r={index === points.length - 1 ? 3 : 2} fill="#27421d" />
        </G>
      ))}
    </Svg>
  );
}

function projectCoordinate(latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (
    lat < BOUNDS.minLatitude - 0.5
    || lat > BOUNDS.maxLatitude + 0.5
    || lng < BOUNDS.minLongitude - 0.5
    || lng > BOUNDS.maxLongitude + 0.5
  ) return null;

  const x = 55 + ((lng - BOUNDS.minLongitude) / (BOUNDS.maxLongitude - BOUNDS.minLongitude)) * 790;
  const y = 425 - ((lat - BOUNDS.minLatitude) / (BOUNDS.maxLatitude - BOUNDS.minLatitude)) * 370;
  return {
    x: Math.max(45, Math.min(855, x)),
    y: Math.max(45, Math.min(435, y)),
  };
}
