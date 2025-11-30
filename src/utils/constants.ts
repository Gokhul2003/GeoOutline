// src/utils/constants.ts

/* ======================== Tile & WMS config ======================== */

export const NRW_WMS_URL = "https://www.wms.nrw.de/geobasis/wms_nw_dop";
export const NRW_WMS_LAYER = "nw_dop_rgb";

/** Map tiles for 'map' view and dark mode */
export const TILE_OSM = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
export const TILE_CARTO_DARK = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

/** Default map center (Cologne coordinates) */
export const INITIAL_CENTER: [number, number] = [50.9375, 6.9603];
export const INITIAL_ZOOM = 12;

/** Local Storage keys */
export const STORAGE_KEY = "flowbit_aoi_list_v1";
export const THEME_KEY = "flowbit_theme_v1";
