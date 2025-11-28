import React from 'react';
import AOIList from './AOIList';

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="flex items-center gap-3 mb-4">
        <button className="p-2 rounded bg-panel-50"><svg width="18" height="18" viewBox="0 0 24 24"><path d="M8 5v14l11-7L8 5z" fill="#c8712f" /></svg></button>
        <div>
          <div className="text-sm text-slate-600 font-medium">Define Area of Interest</div>
          <div className="text-xs text-slate-400">Search or use vector tool to create your region</div>
        </div>
      </div>

      <div className="mb-3">
        <label className="block text-xs text-slate-500 mb-2">Search Area</label>
        <input id="aoi-search" placeholder="Search for city, town, region..." className="w-full px-3 py-2 rounded border focus:outline-none" />
      </div>

      <button id="apply-outline" className="btn-primary w-full mb-2">Apply outline as base image</button>

      <p className="text-xs text-slate-400 mb-4">You can always edit the shape of the area later</p>

      <button className="btn-ghost w-full mb-6" disabled>Confirm Area of Interest</button>

      <div className="mt-6">
        <h3 className="text-sm text-slate-600 mb-2">Saved AOIs</h3>
        <AOIList />
      </div>
    </aside>
  );
}
