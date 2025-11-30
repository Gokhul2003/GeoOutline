// src/utils/wms.ts

import L from "leaflet";
import { NRW_WMS_URL } from "./constants";

/* Create a WMS tile layer using Leaflet */
export function createWmsLayer(map: L.Map, layerName: string) {
  const wms = (L.tileLayer as any).wms(NRW_WMS_URL, {
    layers: layerName,
    format: "image/jpeg",
    transparent: false,
    version: "1.3.0",
    attribution: "© GeoBasis NRW",
    tiled: true,
    noWrap: true
  }) as L.TileLayer.WMS;

  wms.addTo(map);
  return wms;
}
