import { AOI } from '../types';
const KEY = 'flowbit_aoi_features_v1';

export function loadAOIs(): AOI[] {
  try { const raw = localStorage.getItem(KEY); if (!raw) return []; return JSON.parse(raw) as AOI[]; } catch { return []; }
}

export function saveAOIs(list: AOI[]) { localStorage.setItem(KEY, JSON.stringify(list)); }

export function addAOI(aoi: AOI) { const list = loadAOIs(); list.push(aoi); saveAOIs(list); }

export function deleteAOI(id: string) { const list = loadAOIs().filter((a) => a.id !== id); saveAOIs(list); }
