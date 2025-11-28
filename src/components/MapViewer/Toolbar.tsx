import React from "react";

type Props = {
  onStartPolygon?: () => void;
  onStartRectangle?: () => void;
  onEdit?: () => void;
  onSaveEdit?: () => void;
  onDeleteShapes?: () => void;
};

export default function Toolbar({
  onStartPolygon,
  onStartRectangle,
  onEdit,
  onSaveEdit,
  onDeleteShapes,
}: Props) {
  // small button style inline so they look identical across themes
  const btnBase: React.CSSProperties = {
    width: 44,
    height: 44,
    borderRadius: 10,
    background: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
    border: "1px solid rgba(0,0,0,0.06)",
    cursor: "pointer",
    marginBottom: 8,
  };

  return (
    <div style={{
      position: "absolute",
      right: 18,
      top: 120,
      zIndex: 6000,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 6
    }}>
      {/* Save / Finish edit (check) */}
      <button
        title="Save edits"
        onClick={onSaveEdit}
        style={btnBase}
      >
        {/* check icon */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M20 6L9 17l-5-5" stroke="#c96a26" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Rectangle */}
      <button
        title="Draw rectangle"
        onClick={onStartRectangle}
        style={btnBase}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <rect x="4" y="4" width="16" height="16" stroke="#c96a26" strokeWidth="1.6" rx="1" />
        </svg>
      </button>

      {/* Polygon */}
      <button
        title="Draw polygon"
        onClick={onStartPolygon}
        style={btnBase}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M3 12l4-6 4 12 8-10" stroke="#c96a26" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Edit */}
      <button
        title="Edit shapes"
        onClick={onEdit}
        style={btnBase}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M3 21l3-3 11-11 4 4L8 22 3 21z" fill="#c96a26"/>
        </svg>
      </button>

      {/* Delete */}
      <button
        title="Delete shapes"
        onClick={onDeleteShapes}
        style={btnBase}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M3 6h18M8 6v12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6" stroke="#c96a26" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  );
}
