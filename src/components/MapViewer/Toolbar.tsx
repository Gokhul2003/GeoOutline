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
  onDeleteShapes
}: Props) {
  const btn: React.CSSProperties = {
    width: 44,
    height: 44,
    borderRadius: 12,
    background: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
    border: "1px solid rgba(0,0,0,0.08)",
    cursor: "pointer"
  };

  return (
    <div
      style={{
        position: "absolute",
        right: 18,
        top: 120,
        zIndex: 6000,
        display: "flex",
        flexDirection: "column",
        gap: 10
      }}
    >
      {/* SAVE EDIT */}
      <button title="Save edits" onClick={onSaveEdit} style={btn}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M20 6L9 17l-5-5"
            stroke="#c96a26"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* RECTANGLE */}
      <button title="Draw rectangle" onClick={onStartRectangle} style={btn}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <rect
            x="4"
            y="4"
            width="16"
            height="16"
            rx="2"
            stroke="#c96a26"
            strokeWidth="2"
          />
        </svg>
      </button>

      {/* POLYGON */}
      <button title="Draw polygon" onClick={onStartPolygon} style={btn}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M3 12l4-6 5 12 8-10"
            stroke="#c96a26"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* EDIT */}
      <button title="Edit shapes" onClick={onEdit} style={btn}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 21l3-3 11-11-3-3L4 15l-1 6z"
            fill="#c96a26"
          />
        </svg>
      </button>

      {/* DELETE */}
      <button title="Delete shapes" onClick={onDeleteShapes} style={btn}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M3 6h18M8 6v12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6"
            stroke="#c96a26"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
