import { useEffect, useState } from "react";

import { Layer, Source } from "react-map-gl/mapbox";

import { useSettings } from "../../settings/hooks.ts";
import { useNotAtHomes } from "./hooks.ts";
import {
  getClusterLabelLayer,
  getClusterPointLayer,
  getHouseLabelLayer,
  getHousePointLayer,
  getUnitLabelLayer,
  getUnitPointLayer,
  NOT_AT_HOME_SOURCE_ID,
} from "./layers.ts";
import {
  buildNotAtHomeFeatures,
  NOT_AT_HOME_CLUSTER_RADIUS,
  NOT_AT_HOME_CLUSTER_SOURCE_MAX_ZOOM,
} from "./schema.ts";

export interface NotAtHomesLayerProps {
  congregationId?: string;
}

const STALE_REFRESH_MS = 60 * 1000;

export function NotAtHomesLayer({ congregationId }: NotAtHomesLayerProps) {
  const { groups } = useNotAtHomes(congregationId);
  const { settings } = useSettings();
  const staleDays = settings.notAtHomeStaleDays;
  const visibility = settings.notAtHomeVisibility;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (staleDays === 0) return;
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), STALE_REFRESH_MS);
    return () => clearInterval(interval);
  }, [staleDays]);

  if (!groups) return null;

  const features = buildNotAtHomeFeatures(groups, staleDays, now, visibility);
  const geojson = {
    type: "FeatureCollection" as const,
    features,
  };

  return (
    <Source
      id={NOT_AT_HOME_SOURCE_ID}
      type="geojson"
      data={geojson}
      cluster
      clusterMaxZoom={NOT_AT_HOME_CLUSTER_SOURCE_MAX_ZOOM}
      clusterRadius={NOT_AT_HOME_CLUSTER_RADIUS}
      clusterProperties={{
        return_count: ["+", ["get", "return_count"], 0],
        write_count: ["+", ["get", "write_count"], 0],
      }}
    >
      <Layer {...getUnitPointLayer()} />
      <Layer {...getUnitLabelLayer()} />
      <Layer {...getHousePointLayer()} />
      <Layer {...getHouseLabelLayer()} />
      <Layer {...getClusterPointLayer()} />
      <Layer {...getClusterLabelLayer()} />
    </Source>
  );
}
