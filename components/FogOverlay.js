import React from "react";
import { Polygon } from "react-native-maps";
import { WorldTheme } from "../src/maps/services/WorldTheme";

export default function FogOverlay({ fogPolygons }) {
  const theme = WorldTheme.getTheme();

  return (
    <>
      {fogPolygons.map((polygon) => (
        <Polygon
          key={polygon.id}
          coordinates={polygon.coordinates}
          fillColor={theme.fogColor}
          strokeColor="transparent"
          strokeWidth={0}
        />
      ))}
    </>
  );
}