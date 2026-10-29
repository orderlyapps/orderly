import type { CSSProperties, ReactNode } from "react";

import { IonNote } from "@ionic/react";

import "mapbox-gl/mapbox-gl.css";

import { useMapboxMap, type UseMapboxMapOptions } from "./hooks.ts";

export interface MapViewProps extends UseMapboxMapOptions {
  missingTokenMessage?: ReactNode;
}

const containerStyle: CSSProperties = {
  position: "relative",
  height: "100%",
  width: "100%",
  minHeight: "100%",
};

const mapElementStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
};

const messageStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  height: "100%",
  width: "100%",
  padding: "1rem",
  textAlign: "center",
};

const errorBannerStyle: CSSProperties = {
  position: "absolute",
  insetInline: "0.5rem",
  bottom: "0.5rem",
  padding: "0.5rem 0.75rem",
  borderRadius: "0.5rem",
  background: "var(--ion-background-color, #fff)",
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
  zIndex: 1,
};

export const MapView = ({
  missingTokenMessage = "A Mapbox access token is required to display the map. Set VITE_MAPBOX_ACCESS_TOKEN to configure it.",
  ...options
}: MapViewProps) => {
  const { containerRef, error, isConfigured } = useMapboxMap(options);

  if (!isConfigured) {
    return (
      <div style={messageStyle}>
        <IonNote color="medium">{missingTokenMessage}</IonNote>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div ref={containerRef} style={mapElementStyle} />
      {error ? (
        <div style={errorBannerStyle}>
          <IonNote color="danger">{error}</IonNote>
        </div>
      ) : null}
    </div>
  );
};
