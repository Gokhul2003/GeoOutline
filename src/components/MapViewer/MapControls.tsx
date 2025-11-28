import React from "react";

type Props = {
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onToggleView?: () => void;
  viewMode?: "base" | "map";   // made optional
};

export default function MapControls({
  onZoomIn,
  onZoomOut,
  onToggleView,
  viewMode,
}: Props) {
  return (
    <div
      className="controls-cluster absolute right-4 bottom-6 z-[5000] flex flex-col gap-3"
      aria-hidden={false}
    >
      {/* Zoom buttons */}
      <button
        title="Zoom in"
        onClick={onZoomIn}
        className="w-12 h-12 rounded-lg bg-white flex items-center justify-center shadow"
      >
        +
      </button>

      <button
        title="Zoom out"
        onClick={onZoomOut}
        className="w-12 h-12 rounded-lg bg-white flex items-center justify-center shadow"
      >
        −
      </button>

      {/* Base / Map Toggle — only if props provided */}
      {onToggleView && viewMode && (
        <div className="w-36 h-10 bg-white rounded-lg flex items-center justify-between p-1 shadow">
          <button
            onClick={() => onToggleView()}
            className={`text-xs px-2 py-1 rounded ${
              viewMode === "base" ? "bg-brand-300 text-white" : ""
            }`}
          >
            Base Image
          </button>

          <button
            onClick={() => onToggleView()}
            className={`text-xs px-2 py-1 rounded ${
              viewMode === "map" ? "bg-brand-300 text-white" : ""
            }`}
          >
            Map View
          </button>
        </div>
      )}
    </div>
  );
}
