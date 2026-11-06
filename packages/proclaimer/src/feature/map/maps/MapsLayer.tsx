import { useEffect, useRef } from "react";

import type { Expression } from "mapbox-gl";
import { Layer, Source, useMap } from "react-map-gl/mapbox";

import { useMapPolygons } from "./hooks.ts";
import {
  boundaryToBounds,
  MAP_LABEL_MIN_ZOOM,
  MAP_LINE_MIN_ZOOM,
  MAP_POLYGON_COLOR,
  MAP_SELECTED_COLOR,
  MAP_VERTEX_MIN_ZOOM,
  mapRowKey,
} from "./schema.ts";

export interface MapsLayerProps {
  congregationId?: string;
  autoFitBounds?: boolean;
  fitBoundsPadding?: number;
  /** Key (id or name) of the map to highlight and zoom to. */
  selectedMap?: string | null;
}

export function MapsLayer({
  congregationId,
  autoFitBounds = false,
  fitBoundsPadding = 60,
  selectedMap = null,
}: MapsLayerProps) {
  const { geojson, bounds, maps } = useMapPolygons(congregationId);
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

  useEffect(() => {
    if (!map || !selectedMap) {
      return;
    }
    const row = maps.find((entry) => mapRowKey(entry) === selectedMap);
    const selectedBounds = row ? boundaryToBounds(row.boundary) : null;
    if (selectedBounds) {
      map.fitBounds(selectedBounds, { padding: fitBoundsPadding, animate: true });
    }
  }, [selectedMap, maps, map, fitBoundsPadding]);

  const featureKey: Expression = ["coalesce", ["get", "id"], ["get", "name"]];
  const isSelected: Expression = selectedMap ? ["==", featureKey, selectedMap] : ["literal", false];

  return (
    <Source id="maps" type="geojson" data={geojson}>
      <Layer
        id="maps-line"
        type="line"
        minzoom={MAP_LINE_MIN_ZOOM}
        filter={["!", isSelected]}
        beforeId="road-label"
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
        id="maps-line-selected"
        type="line"
        minzoom={MAP_LINE_MIN_ZOOM}
        filter={isSelected}
        beforeId="road-label"
        layout={{ "line-cap": "round", "line-join": "round" }}
        paint={{
          "line-color": MAP_SELECTED_COLOR,
          "line-width": ["interpolate", ["linear"], ["zoom"], MAP_LINE_MIN_ZOOM, 0, 24, 18],
          "line-opacity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            MAP_LINE_MIN_ZOOM,
            0.7,
            MAP_VERTEX_MIN_ZOOM,
            0.9,
          ],
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
          "text-color": ["case", isSelected, MAP_SELECTED_COLOR, MAP_POLYGON_COLOR],
          "text-opacity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            11,
            0,
            16,
            ["case", isSelected, 1, 0.6],
          ],
          "text-halo-color": "#dddddd",
          "text-halo-width": 1,
        }}
      />
    </Source>
  );
}
