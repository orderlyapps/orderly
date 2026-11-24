import type { Expression, FilterSpecification } from "mapbox-gl";
import type { LayerProps } from "react-map-gl/mapbox";

import {
  NOT_AT_HOME_CLUSTER_COLOR,
  NOT_AT_HOME_CLUSTER_MAX_ZOOM,
  NOT_AT_HOME_LABEL_MIN_ZOOM,
  NOT_AT_HOME_RETURN_COLOR,
  NOT_AT_HOME_STALE_COLOR,
  NOT_AT_HOME_UNIT_MIN_ZOOM,
  NOT_AT_HOME_WRITE_COLOR,
} from "./schema.ts";

export const NOT_AT_HOME_SOURCE_ID = "not-at-home";

const markerColor = (allWriteCheck: Expression): Expression => [
  "case",
  allWriteCheck,
  NOT_AT_HOME_WRITE_COLOR,
  ["==", ["get", "stale"], true],
  NOT_AT_HOME_STALE_COLOR,
  NOT_AT_HOME_RETURN_COLOR,
];

export const getUnitPointLayer = (): LayerProps => {
  return {
    id: "not-at-home-unit-points",
    type: "circle",
    source: NOT_AT_HOME_SOURCE_ID,
    minzoom: NOT_AT_HOME_UNIT_MIN_ZOOM,
    filter: ["case", [">", ["get", "unit_count"], 1], true, false],
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 14, 4, 16.5, 10, 18, 55],
      "circle-color": markerColor(["==", ["get", "return_count"], 0]),
    },
  };
};

export const getUnitLabelLayer = (): LayerProps => {
  return {
    id: "not-at-home-unit-labels",
    type: "symbol",
    source: NOT_AT_HOME_SOURCE_ID,
    minzoom: NOT_AT_HOME_LABEL_MIN_ZOOM,
    filter: ["case", [">", ["get", "unit_count"], 1], true, false],
    layout: {
      "text-field": [
        "concat",
        ["get", "house_number"],
        "\n",
        ["get", "return_count"],
        " unit",
        ["case", ["==", ["get", "return_count"], 1], "", "s"],
      ],
      "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
      "text-size": ["interpolate", ["linear"], ["zoom"], 16.5, 5, 18, 27],
      "text-offset": [0, -0.25],
      "text-anchor": "center",
    },
    paint: {
      "text-color": "#ffffff",
      "text-halo-color": markerColor(["==", ["get", "return_count"], 0]),
      "text-halo-width": 5,
    },
  };
};

export const getHousePointLayer = (): LayerProps => {
  return {
    id: "not-at-home-house-points",
    type: "circle",
    source: NOT_AT_HOME_SOURCE_ID,
    minzoom: NOT_AT_HOME_UNIT_MIN_ZOOM,
    filter: ["case", ["==", ["get", "unit_count"], 1], true, false],
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 14, 3, 16.5, 8, 18, 32],
      "circle-color": markerColor(["==", ["get", "write"], true]),
    },
  };
};

export const getHouseLabelLayer = (): LayerProps => {
  return {
    id: "not-at-home-house-labels",
    type: "symbol",
    source: NOT_AT_HOME_SOURCE_ID,
    minzoom: NOT_AT_HOME_LABEL_MIN_ZOOM,
    filter: ["case", ["==", ["get", "unit_count"], 1], true, false],
    layout: {
      "text-field": [
        "concat",
        [
          "case",
          ["to-boolean", ["get", "unit_number"]],
          ["concat", ["get", "unit_number"], "/"],
          "",
        ],
        ["get", "house_number"],
      ],
      "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
      "text-size": ["interpolate", ["linear"], ["zoom"], 16.5, 6, 18, 30],
      "text-offset": [0, 0],
      "text-anchor": "center",
    },
    paint: {
      "text-color": "#ffffff",
      "text-halo-color": markerColor(["==", ["get", "write"], true]),
      "text-halo-width": 5,
    },
  };
};

const clusterFilter: FilterSpecification = [
  "case",
  ["has", "point_count"],
  ["case", [">=", ["get", "return_count"], 1], true, false],
  ["case", ["==", ["get", "write"], false], true, false],
];

export const getClusterPointLayer = (): LayerProps => {
  return {
    id: "not-at-home-cluster-points",
    type: "circle",
    source: NOT_AT_HOME_SOURCE_ID,
    maxzoom: NOT_AT_HOME_CLUSTER_MAX_ZOOM,
    filter: clusterFilter,
    paint: {
      "circle-radius": [
        "case",
        ["has", "point_count"],
        ["interpolate", ["linear"], ["get", "return_count"], 0, 10, 500, 100],
        8,
      ],
      "circle-color": NOT_AT_HOME_CLUSTER_COLOR,
    },
  };
};

export const getClusterLabelLayer = (): LayerProps => {
  return {
    id: "not-at-home-cluster-labels",
    type: "symbol",
    source: NOT_AT_HOME_SOURCE_ID,
    filter: clusterFilter,
    maxzoom: NOT_AT_HOME_CLUSTER_MAX_ZOOM,
    layout: {
      "text-field": ["case", ["has", "point_count"], ["concat", ["get", "return_count"]], "1"],
      "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
      "text-size": [
        "case",
        ["has", "point_count"],
        ["interpolate", ["linear"], ["get", "return_count"], 0, 13, 500, 90],
        12,
      ],
      "text-offset": [0, 0],
      "text-anchor": "center",
    },
    paint: {
      "text-color": "#ffffff",
      "text-halo-color": NOT_AT_HOME_CLUSTER_COLOR,
      "text-halo-width": 5,
    },
  };
};
