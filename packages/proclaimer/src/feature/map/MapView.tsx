import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

import { IonNote } from "@ionic/react";
import Map, { GeolocateControl, NavigationControl } from "react-map-gl/mapbox";

import "mapbox-gl/mapbox-gl.css";

import { useMapView, type UseMapViewOptions } from "./hooks.ts";

export interface MapViewProps extends UseMapViewOptions {
  showNavigationControl?: boolean;
  showGeolocateControl?: boolean;
  missingTokenMessage?: ReactNode;
  children?: ReactNode;
}

const containerStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
};

const mapElementStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
};

const messageStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "1rem",
  textAlign: "center",
};

const errorBannerStyle: CSSProperties = {
  position: "absolute",
  insetInline: "0.5rem",
  bottom:
    "calc(60px + var(--ios-theme-floating-safe-area-bottom, var(--ios26-floating-safe-area-bottom, 0px)) + 0.5rem)",
  padding: "0.5rem 0.75rem",
  borderRadius: "0.5rem",
  background: "var(--ion-background-color, #fff)",
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
  zIndex: 1,
};

export const MapView = ({
  showNavigationControl = true,
  showGeolocateControl = true,
  missingTokenMessage = "A Mapbox access token is required to display the map. Set VITE_MAPBOX_ACCESS_TOKEN to configure it.",
  children,
  ...options
}: MapViewProps) => {
  const { accessToken } = options;
  const { mapRef, mapKey, error, isConfigured, resolvedStyle, mapProps } = useMapView(options);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isConfigured) {
      return;
    }

    let frame = 0;
    const resize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => mapRef.current?.resize());
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    const page = container.closest("ion-page");
    const mutationObserver = page
      ? new MutationObserver(() => {
          if (!page.classList.contains("ion-page-hidden")) {
            resize();
          }
        })
      : null;
    if (page) {
      mutationObserver?.observe(page, { attributeFilter: ["class"], attributes: true });
    }

    resize();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      mutationObserver?.disconnect();
    };
  }, [isConfigured, mapRef]);

  if (!isConfigured || !accessToken) {
    return (
      <div style={messageStyle}>
        <IonNote color="medium">{missingTokenMessage}</IonNote>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={containerStyle}>
      <Map
        key={mapKey}
        ref={mapRef}
        mapboxAccessToken={accessToken.trim()}
        mapStyle={resolvedStyle}
        style={mapElementStyle}
        {...mapProps}
      >
        {showNavigationControl ? <NavigationControl position="top-right" /> : null}
        {showGeolocateControl ? (
          <GeolocateControl
            position="top-right"
            positionOptions={{ enableHighAccuracy: true }}
            trackUserLocation
          />
        ) : null}
        {children}
      </Map>
      {error ? (
        <div style={errorBannerStyle}>
          <IonNote color="danger">{error}</IonNote>
        </div>
      ) : null}
    </div>
  );
};
