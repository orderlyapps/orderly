import { Layer, Source } from "react-map-gl/mapbox";

import { MAP_PRIMARY_COLOR } from "../maps/schema.ts";
import { useMasterMap } from "./hooks.ts";

export interface MasterMapLayerProps {
  congregationId?: string;
}

export function MasterMapLayer({ congregationId }: MasterMapLayerProps) {
  const { geojson } = useMasterMap(congregationId);

  return (
    <Source id="map-master" type="geojson" data={geojson}>
      <Layer
        id="map-master-line"
        type="line"
        beforeId="road-label"
        layout={{ "line-cap": "round", "line-join": "round" }}
        paint={{
          "line-color": MAP_PRIMARY_COLOR,
          "line-width": ["interpolate", ["linear"], ["zoom"], 0, 1, 22, 12],
          "line-opacity": 0.6,
        }}
      />
    </Source>
  );
}
