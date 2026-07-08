import React from "react";
import { Polygon } from "react-native-maps";

export default function FogOverlay({ fogPolygons = [] }) {
  return (
    <>
      {fogPolygons.map((polygon, index) => (
        <Polygon
          key={"fog-" + index}
          coordinates={polygon}
fillColor="rgba(18, 28, 36, 0.28)"
strokeColor="rgba(18, 28, 36, 0)"
          strokeWidth={0}
          tappable={false}
          zIndex={9999}
        />
      ))}
    </>
  );
}