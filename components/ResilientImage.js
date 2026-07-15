import React, { useEffect, useState } from "react";
import { Image } from "react-native";

export default function ResilientImage({ source, fallbackSource, fallbackElement = null, ...props }) {
  const [failed, setFailed] = useState(false);
  const sourceKey = typeof source === "number" ? String(source) : source?.uri || "empty";

  useEffect(() => {
    setFailed(false);
  }, [sourceKey]);

  if ((!source || failed) && !fallbackSource) {
    return fallbackElement;
  }

  return (
    <Image
      {...props}
      source={failed && fallbackSource ? fallbackSource : source || fallbackSource}
      onError={(event) => {
        if (fallbackSource && !failed) {
          setFailed(true);
        } else if (!fallbackSource) {
          setFailed(true);
        }
        props.onError?.(event);
      }}
    />
  );
}
