import { useEffect, useMemo, useRef } from "react";

import type { Expression } from "mapbox-gl";
import { Layer, Source, useMap } from "react-map-gl/mapbox";

import { useMapPolygons } from "./hooks.ts";
import {
  boundaryToBounds,
  MAP_BLOCK_COLOR,
  MAP_LABEL_MIN_ZOOM,
  MAP_LINE_MIN_ZOOM,
  MAP_POLYGON_COLOR,
  MAP_SELECTED_COLOR,
  MAP_VERTEX_MIN_ZOOM,
  mapBlocksToGeoJSON,
  mapRowKey,
  type MapBounds,
} from "./schema.ts";

export interface MapsLayerProps {
  congregationId?: string;
  autoFitBounds?: boolean;
  fitBoundsPadding?: number;
  /** Bounds to fit when the map rows yield none, e.g. a master-map outline. */
  fallbackBounds?: MapBounds | null;
  /** Key (id or name) of the map to highlight and zoom to. */
  selectedMap?: string | null;
  selectedMapFitKey?: string | number;
}

export function MapsLayer({
  congregationId,
  autoFitBounds = false,
  fitBoundsPadding = 60,
  fallbackBounds = null,
  selectedMap = null,
  selectedMapFitKey = 0,
}: MapsLayerProps) {
  const { geojson, bounds, maps } = useMapPolygons(congregationId);
  const { current: map } = useMap();
  const hasFittedRef = useRef(false);
  const selectedFittedForRef = useRef<string | null>(null);

  useEffect(() => {
    hasFittedRef.current = false;
    selectedFittedForRef.current = null;
  }, [congregationId]);

  const fitBounds = bounds ?? fallbackBounds;

  useEffect(() => {
    if (!autoFitBounds || hasFittedRef.current || !map || !fitBounds) {
      return;
    }
    hasFittedRef.current = true;
    map.fitBounds(fitBounds, { padding: fitBoundsPadding, animate: true });
  }, [autoFitBounds, fitBounds, map, fitBoundsPadding]);

  useEffect(() => {
    if (!map) {
      return;
    }
    if (!selectedMap) {
      selectedFittedForRef.current = null;
      return;
    }
    const fitId = `${selectedMap}:${selectedMapFitKey}`;
    if (selectedFittedForRef.current === fitId) {
      return;
    }
    const row = maps.find((entry) => mapRowKey(entry) === selectedMap);
    const selectedBounds = row ? boundaryToBounds(row.boundary) : null;
    if (selectedBounds) {
      // Only mark after a real fit so a selection made before the rows load
      // still zooms once the data arrives.
      selectedFittedForRef.current = fitId;
      map.fitBounds(selectedBounds, { padding: fitBoundsPadding, animate: true });
    }
  }, [selectedMap, selectedMapFitKey, maps, map, fitBoundsPadding]);

  const featureKey: Expression = ["coalesce", ["get", "id"], ["get", "name"]];
  const isSelected: Expression = selectedMap ? ["==", featureKey, selectedMap] : ["literal", false];

  const blocksGeojson = useMemo(() => {
    const row = selectedMap ? maps.find((entry) => mapRowKey(entry) === selectedMap) : undefined;
    const geojson = mapBlocksToGeoJSON(row?.blocks);
    return geojson.features.length > 0 ? geojson : null;
  }, [selectedMap, maps]);

  return (
    <>
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
          filter={["==", ["geometry-type"], "Point"]}
          layout={{
            "text-field": ["get", "name"],
            "text-size": ["interpolate", ["linear"], ["zoom"], MAP_LABEL_MIN_ZOOM, 0, 21, 75],
            "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
            "text-anchor": "center",
            "symbol-placement": "point",
            "text-allow-overlap": true,
            "text-ignore-placement": true,
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
      {blocksGeojson ? (
        <Source id="map-blocks" type="geojson" data={blocksGeojson}>
          <Layer
            id="map-blocks-line"
            type="line"
            minzoom={MAP_VERTEX_MIN_ZOOM}
            beforeId="road-label"
            layout={{ "line-cap": "round", "line-join": "round" }}
            paint={{
              "line-color": MAP_BLOCK_COLOR,
              "line-width": 2,
              "line-opacity": [
                "interpolate",
                ["linear"],
                ["zoom"],
                MAP_VERTEX_MIN_ZOOM,
                0,
                19,
                0.7,
              ],
              "line-dasharray": [0.5, 3],
            }}
          />
          <Layer
            id="map-blocks-labels"
            type="symbol"
            minzoom={MAP_VERTEX_MIN_ZOOM}
            filter={["==", ["geometry-type"], "Point"]}
            layout={{
              "text-field": ["get", "name"],
              "text-size": ["interpolate", ["linear"], ["zoom"], MAP_LABEL_MIN_ZOOM, 0, 21, 75],
              "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
              "text-anchor": "center",
              "symbol-placement": "point",
              "text-allow-overlap": true,
              "text-ignore-placement": true,
            }}
            paint={{
              "text-color": MAP_BLOCK_COLOR,
              "text-opacity": [
                "interpolate",
                ["linear"],
                ["zoom"],
                MAP_VERTEX_MIN_ZOOM - 1,
                0,
                MAP_VERTEX_MIN_ZOOM + 3,
                1,
              ],
              "text-halo-color": "#dddddd",
              "text-halo-width": 1,
            }}
          />
        </Source>
      ) : null}
    </>
  );
}
