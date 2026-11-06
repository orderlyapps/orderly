import { useEffect, useRef } from "react";

import { Layer, Source, useMap } from "react-map-gl/mapbox";

import { useMapPolygons } from "./hooks.ts";
import {
  MAP_LABEL_MIN_ZOOM,
  MAP_LINE_MIN_ZOOM,
  MAP_POLYGON_COLOR,
  MAP_VERTEX_MIN_ZOOM,
} from "./schema.ts";

export interface MapsLayerProps {
  congregationId?: string;
  autoFitBounds?: boolean;
  fitBoundsPadding?: number;
}

export function MapsLayer({
  congregationId,
  autoFitBounds = false,
  fitBoundsPadding = 60,
}: MapsLayerProps) {
  const { geojson, bounds } = useMapPolygons(congregationId);
  const { current: map } = useMap();
  const hasFittedRef = useRef(false);

  useEffect(() => {
    hasFittedRef.current = false;
  }, [congregationId]);

  useEffect(() => {
    if (!autoFitBounds || hasFittedRef.current || !map || !bounds) {
      return;
    }
    hasFittedRef.current = true;
    map.fitBounds(bounds, { padding: fitBoundsPadding, animate: true });
  }, [autoFitBounds, bounds, map, fitBoundsPadding]);

  return (
    <Source id="maps" type="geojson" data={geojson}>
      <Layer
        id="maps-line"
        type="line"
        minzoom={MAP_LINE_MIN_ZOOM}
        layout={{ "line-cap": "round", "line-join": "round" }}
        paint={{
          "line-color": MAP_POLYGON_COLOR,
          "line-width": 2,
          "line-opacity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            MAP_LINE_MIN_ZOOM,
            0,
            MAP_VERTEX_MIN_ZOOM,
            0.7,
          ],
          "line-dasharray": [0.5, 3],
        }}
      />
      <Layer
        id="maps-labels"
        type="symbol"
        minzoom={MAP_LABEL_MIN_ZOOM}
        layout={{
          "text-field": ["get", "name"],
          "text-size": ["interpolate", ["linear"], ["zoom"], MAP_LABEL_MIN_ZOOM, 0, 21, 75],
          "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
          "text-anchor": "center",
          "symbol-placement": "point",
        }}
        paint={{
          "text-color": MAP_POLYGON_COLOR,
          "text-opacity": 0.5,
          "text-halo-color": "#ffffff",
          "text-halo-width": 2,
        }}
      />
    </Source>
  );
}
