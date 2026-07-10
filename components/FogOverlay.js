import React from "react";
import { Polygon } from "react-native-maps";

export default function FogOverlay({ fogPolygons = [] }) {
  return (
    <>
      {fogPolygons.map((polygon, index) => (
        <Polygon
          key={`fog-${index}`}
          coordinates={polygon}
          fillColor="rgba(9, 15, 22, 0.50)"
          strokeColor="rgba(9, 15, 22, 0)"
          strokeWidth={0}
          tappable={false}
          zIndex={7300}
        />
      ))}
    </>
  );
}
