import React from "react";

type Props = {
  onStartPolygon?: () => void;
  onStartRectangle?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
};

export default function Toolbar({
  onStartPolygon,
  onStartRectangle,
  onEdit,
  onDelete,
}: Props) {
  return (
    <div
      className="draw-toolbar absolute right-4 top-32 z-[5200] flex flex-col gap-3"
      role="toolbar"
      aria-label="Drawing tools"
    >
      {/* Polygon */}
      <button className="draw-btn" title="Draw polygon" onClick={onStartPolygon}>
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path
            d="M3 12l4-6 4 12 8-10"
            stroke="#c8712f"
            strokeWidth="1.6"
            fill="none"
          />
        </svg>
      </button>

      {/* Rectangle */}
      <button
        className="draw-btn"
        title="Draw rectangle"
        onClick={onStartRectangle}
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path
            d="M4 4h16v16H4z"
            stroke="#c8712f"
            strokeWidth="1.6"
            fill="none"
          />
        </svg>
      </button>

      {/* Edit */}
      <button className="draw-btn" title="Edit shapes" onClick={onEdit}>
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path
            d="M3 21l3-3 11-11 4 4L8 22 3 21z"
            fill="#c8712f"
          />
        </svg>
      </button>

      {/* Delete */}
      <button className="draw-btn" title="Delete shapes" onClick={onDelete}>
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path
            d="M3 6h18M8 6v12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6"
            stroke="#c8712f"
            strokeWidth="1.6"
            fill="none"
          />
        </svg>
      </button>
    </div>
  );
}
