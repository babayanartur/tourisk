import React from "react";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from "react-native-svg";

export default function TouriskExplorerGlyph({ size = 88, color = "#b8f55b", warmColor = "#f4c451" }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Defs>
        <RadialGradient id="touriskAura" cx="50%" cy="52%" r="50%">
          <Stop offset="0" stopColor={color} stopOpacity="0.42" />
          <Stop offset="0.54" stopColor={color} stopOpacity="0.15" />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id="touriskBody" x1="20%" y1="8%" x2="82%" y2="92%">
          <Stop offset="0" stopColor="#f4ffe6" />
          <Stop offset="0.32" stopColor={color} />
          <Stop offset="0.72" stopColor="#568a32" />
          <Stop offset="1" stopColor="#183c2c" />
        </LinearGradient>
        <LinearGradient id="touriskGold" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#fff3c0" />
          <Stop offset="0.5" stopColor={warmColor} />
          <Stop offset="1" stopColor="#9f6d20" />
        </LinearGradient>
      </Defs>

      <Circle cx="60" cy="61" r="53" fill="url(#touriskAura)" />
      <Ellipse cx="60" cy="96" rx="27" ry="8" fill="#00110d" opacity="0.45" />
      <Ellipse cx="60" cy="94" rx="19" ry="5" fill={warmColor} opacity="0.23" />

      <G>
        <Path
          d="M60 14 L67 24 L60 34 L53 24 Z"
          fill="url(#touriskGold)"
          stroke="#fff8d7"
          strokeWidth="1.2"
        />
        <Circle cx="60" cy="25" r="2.8" fill="#fff9d8" />

        <Path
          d="M60 34 C45 41 38 53 39 68 C40 82 48 92 60 101 C72 92 80 82 81 68 C82 53 75 41 60 34 Z"
          fill="url(#touriskBody)"
          stroke="#eaffc6"
          strokeOpacity="0.74"
          strokeWidth="1.5"
        />
        <Path
          d="M60 43 C51 49 47 57 48 67 C49 76 53 83 60 90 C67 83 71 76 72 67 C73 57 69 49 60 43 Z"
          fill="#082c24"
          opacity="0.64"
        />
        <Path
          d="M60 46 C55 55 54 66 60 82 C66 66 65 55 60 46 Z"
          fill="url(#touriskGold)"
          opacity="0.95"
        />
        <Path
          d="M43 65 C49 62 54 62 60 66 C66 62 71 62 77 65"
          fill="none"
          stroke="#f7ffd9"
          strokeOpacity="0.64"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </G>

      <Path
        d="M29 86 C38 103 82 103 91 86"
        fill="none"
        stroke="url(#touriskGold)"
        strokeWidth="2.3"
        strokeLinecap="round"
        opacity="0.82"
      />
      <Circle cx="29" cy="86" r="2.1" fill={warmColor} />
      <Circle cx="91" cy="86" r="2.1" fill={warmColor} />
    </Svg>
  );
}
