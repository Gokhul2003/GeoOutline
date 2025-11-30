import React from "react";

type Props = {
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onToggleView?: () => void;
  viewMode?: "base" | "map";
};

export default function MapControls({
  onZoomIn,
  onZoomOut,
  onToggleView,
  viewMode
}: Props) {
  const btn: React.CSSProperties = {
    width: 44,
    height: 44,
    borderRadius: 10,
    background: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
    border: "1px solid rgba(0,0,0,0.08)",
    cursor: "pointer",
    fontSize: 22,
    fontWeight: 500
  };

  return (
    <div
      style={{
        position: "absolute",
        right: 60,
        bottom: 130,
        zIndex: 6000,
        display: "flex",
        flexDirection: "column",
        gap: 10
      }}
    >
      {/* ZOOM IN */}
      <button title="Zoom in" onClick={onZoomIn} style={btn}>
        +
      </button>

      {/* ZOOM OUT */}
      <button title="Zoom out" onClick={onZoomOut} style={btn}>
        −
      </button>

      {/* TOGGLE VIEW */}
      <button title="Toggle base/map" onClick={onToggleView} style={btn}>
        {viewMode === "base" ? (
          <span role="img" aria-label="map">🗺</span>
        ) : (
          <span role="img" aria-label="satellite">🛰</span>
        )}
      </button>
    </div>
  );
}