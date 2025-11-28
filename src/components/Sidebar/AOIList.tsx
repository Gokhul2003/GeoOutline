import React, { useEffect, useState } from 'react';
import { loadAOIs, deleteAOI } from '../../utils/storage';
import { AOI } from '../../types';
import toast from 'react-hot-toast';

export default function AOIList() {
  const [list, setList] = useState<AOI[]>([]);

  useEffect(() => {
    setList(loadAOIs());
    const handler = () => setList(loadAOIs());
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  function handleZoom(aoi: AOI) {
    window.dispatchEvent(new CustomEvent('flowbit:zoomToAOI', { detail: aoi }));
  }

  function handleDelete(id: string) {
    deleteAOI(id);
    setList(loadAOIs());
    toast.success('AOI deleted');
  }

  if (list.length === 0) return <div className="text-xs text-slate-400">No AOIs created yet</div>;

  return (
    <ul className="space-y-2">
      {list.map((a) => (
        <li key={a.id} className="flex items-center justify-between border rounded p-2">
          <div>
            <div className="text-sm font-medium">{a.name || 'Untitled AOI'}</div>
            <div className="text-xs text-slate-400">{new Date(a.createdAt).toLocaleString()}</div>
          </div>
          <div className="flex flex-col gap-1">
            <button onClick={() => handleZoom(a)} className="text-xs text-brand-700">Zoom</button>
            <button onClick={() => handleDelete(a.id)} className="text-xs text-red-600">Delete</button>
          </div>
        </li>
      ))}
    </ul>
  );
}
