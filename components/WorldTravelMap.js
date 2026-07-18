import React, { useMemo } from "react";
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  Polyline,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";

const WIDTH = 1000;
const HEIGHT = 500;
const MAP = { left: 36, top: 42, width: 928, height: 410 };

const CONTINENTS = [
  // North America
  "M87 116 L124 82 L194 69 L248 87 L285 121 L274 151 L239 169 L220 205 L190 215 L170 249 L139 238 L128 201 L103 183 L76 151 Z",
  // Greenland
  "M282 64 L327 52 L354 76 L342 107 L306 112 L280 91 Z",
  // South America
  "M242 248 L281 231 L316 249 L331 287 L316 327 L300 350 L291 391 L264 431 L242 409 L244 373 L226 340 L230 298 Z",
  // Europe
  "M459 121 L491 104 L532 108 L551 127 L537 145 L509 151 L494 169 L463 159 L445 142 Z",
  // Africa
  "M477 178 L526 165 L574 184 L589 224 L574 267 L548 305 L522 343 L489 327 L478 290 L451 249 L452 210 Z",
  // Asia
  "M547 111 L595 83 L671 78 L740 94 L795 117 L874 126 L918 159 L901 189 L853 196 L817 225 L764 216 L727 244 L672 227 L640 199 L595 186 L565 152 Z",
  // Arabian peninsula / India
  "M579 211 L617 218 L636 248 L611 274 L582 251 Z M672 225 L706 239 L724 282 L702 316 L679 278 Z",
  // Japan / islands
  "M876 196 L892 207 L886 228 L873 218 Z M915 245 L930 254 L925 270 L911 260 Z",
  // Australia
  "M764 330 L810 309 L858 323 L880 357 L861 393 L817 409 L776 389 L750 359 Z",
  // New Zealand
  "M904 392 L918 407 L911 430 L899 416 Z",
];

export default function WorldTravelMap({ checkins = [], style }) {
  const points = useMemo(
    () => checkins
      .map((item) => projectCoordinate(item?.latitude, item?.longitude))
      .filter(Boolean)
      .slice(-48),
    [checkins]
  );

  const route = points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={style}>
      <Defs>
        <LinearGradient id="worldBg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#06191a" />
          <Stop offset="0.56" stopColor="#031315" />
          <Stop offset="1" stopColor="#010b0d" />
        </LinearGradient>
        <LinearGradient id="landFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#365c3a" stopOpacity={0.78} />
          <Stop offset="1" stopColor="#142b20" stopOpacity={0.88} />
        </LinearGradient>
        <RadialGradient id="travelGlow" cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0" stopColor="#e7ffad" stopOpacity={0.96} />
          <Stop offset="0.24" stopColor="#b8f55b" stopOpacity={0.64} />
          <Stop offset="1" stopColor="#8ae442" stopOpacity={0} />
        </RadialGradient>
      </Defs>

      <Rect width={WIDTH} height={HEIGHT} rx={34} fill="url(#worldBg)" />

      {[0.18, 0.36, 0.54, 0.72, 0.90].map((ratio) => (
        <Path
          key={`lat-${ratio}`}
          d={`M ${MAP.left} ${MAP.top + MAP.height * ratio} L ${MAP.left + MAP.width} ${MAP.top + MAP.height * ratio}`}
          stroke="#b9d0c0"
          strokeOpacity={0.055}
          strokeWidth={1.5}
        />
      ))}
      {[0.16, 0.33, 0.5, 0.67, 0.84].map((ratio) => (
        <Path
          key={`lng-${ratio}`}
          d={`M ${MAP.left + MAP.width * ratio} ${MAP.top} C ${MAP.left + MAP.width * ratio - 20} 160 ${MAP.left + MAP.width * ratio + 20} 340 ${MAP.left + MAP.width * ratio} ${MAP.top + MAP.height}`}
          stroke="#b9d0c0"
          strokeOpacity={0.045}
          strokeWidth={1.5}
        />
      ))}

      <G>
        {CONTINENTS.map((d, index) => (
          <Path
            key={`continent-${index}`}
            d={d}
            fill="url(#landFill)"
            stroke="#a8e859"
            strokeOpacity={0.42}
            strokeWidth={2.2}
            strokeLinejoin="round"
          />
        ))}
      </G>

      {points.length > 1 ? (
        <Polyline
          points={route}
          fill="none"
          stroke="#d9ff91"
          strokeOpacity={0.74}
          strokeWidth={4.2}
          strokeDasharray="10 10"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}

      {points.map((point, index) => {
        const latest = index === points.length - 1;
        return (
          <G key={`point-${point.x}-${point.y}-${index}`}>
            <Circle cx={point.x} cy={point.y} r={latest ? 42 : 27} fill="url(#travelGlow)" opacity={latest ? 0.92 : 0.50} />
            <Circle cx={point.x} cy={point.y} r={latest ? 8 : 5} fill="#dfff99" />
            <Circle cx={point.x} cy={point.y} r={latest ? 3.2 : 2} fill="#21351b" />
          </G>
        );
      })}
    </Svg>
  );
}

function projectCoordinate(latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const clampedLat = Math.max(-82, Math.min(82, lat));
  const normalizedLng = ((lng + 180) % 360 + 360) % 360 - 180;
  const x = MAP.left + ((normalizedLng + 180) / 360) * MAP.width;
  const mercator = Math.log(Math.tan(Math.PI / 4 + (clampedLat * Math.PI) / 360));
  const maxMercator = Math.log(Math.tan(Math.PI / 4 + (82 * Math.PI) / 360));
  const y = MAP.top + (0.5 - mercator / (2 * maxMercator)) * MAP.height;

  return {
    x: Math.max(MAP.left, Math.min(MAP.left + MAP.width, x)),
    y: Math.max(MAP.top, Math.min(MAP.top + MAP.height, y)),
  };
}
