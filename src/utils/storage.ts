// src/utils/storage.ts

import { STORAGE_KEY } from "./constants";

export interface AOI {
  id: string;
  name: string;
  geometry: any;
  createdAt: string;
}

export function loadAOIs(): AOI[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveAOIs(list: AOI[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

export function addAOI(aoi: AOI) {
  const list = loadAOIs();
  list.push(aoi);
  saveAOIs(list);
}
