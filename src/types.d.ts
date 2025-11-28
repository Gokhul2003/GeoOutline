export type AOI = {
  id: string;
  name?: string;
  geometry: GeoJSON.GeoJSON;
  createdAt: string;
  metadata?: Record<string, any>;
};
