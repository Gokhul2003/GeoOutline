// src/components/MapViewer/MapSidebar.tsx

import React, { useState } from "react";
import { AOI } from "../../utils/storage";

type SidebarProps = {
  theme: "light" | "dark";
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean | ((prev: boolean) => boolean)) => void;

  sectionOpen: {
    baseSelect: boolean;
    defineAOI: boolean;
    defineObjects: boolean;
  };
  setSectionOpen: (v: any) => void;

  viewMode: "base" | "map";
  setViewMode: (v: "base" | "map") => void;

  searchQuery: string;
  setSearchQuery: (v: string) => void;

  suggestions: any[];
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  applySuggestion: (s: any) => void;

  applyOutlineAsBase: () => void;
  confirmAOI: () => void;
  confirmDisabled: boolean;

  aois: AOI[];
  zoomToSaved: (a: AOI) => void;
  showAOI: (a: AOI) => void;
  deleteAOI: (id: string) => void;

  applyTheme: (next: "light" | "dark") => void;
};

export default function MapSidebar(props: SidebarProps) {
  const {
    theme,
    sidebarOpen,
    setSidebarOpen,
    sectionOpen,
    setSectionOpen,
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    suggestions,
    handleInputChange,
    applySuggestion,
    applyOutlineAsBase,
    confirmAOI,
    confirmDisabled,
    aois,
    zoomToSaved,
    showAOI,
    deleteAOI,
    applyTheme
  } = props;

  const sidebarStyle: React.CSSProperties = {
    width: 360,
    padding: 18,
    boxSizing: "border-box",
    background: theme === "dark" ? "#071022" : "#fff",
    color: theme === "dark" ? "#e6eef8" : "#111827",
    borderRight: theme === "dark" ? "1px solid #0f1724" : "1px solid #e6e6e6",
    transition: "transform 320ms cubic-bezier(.2,.9,.2,1), background 200ms ease",
    zIndex: 4500,
    position: sidebarOpen ? "relative" : "absolute",
    transform: sidebarOpen ? "translateX(0)" : "translateX(-420px)",
    left: 0,
    top: 0,
    bottom: 0,
    height: "100vh",
    overflowY: "auto",
  };

  return (
    <aside style={sidebarStyle}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 14, color: theme === "dark" ? "#ffa86b" : "#c96a26", fontWeight: 700 }}>Project</div>
          <div style={{ fontSize: 12, color: theme === "dark" ? "#9fb2c9" : "#6b7280" }}>NRW base + AOI tools</div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={() => applyTheme(theme === "light" ? "dark" : "light")}
            style={{
              padding: "6px 8px",
              borderRadius: 8,
              background: theme === "dark" ? "#0b1220" : "#f8fafc",
              border: "1px solid rgba(0,0,0,0.06)",
              cursor: "pointer"
            }}
          >
            {theme === "dark" ? "🌙" : "☀️"}
          </button>

          <button
            onClick={() => setSidebarOpen((s: boolean) => !s)}
            style={{
              padding: "6px 8px",
              borderRadius: 8,
              background: theme === "dark" ? "#0b1220" : "#f3f4f6",
              cursor: "pointer"
            }}
          >
            {sidebarOpen ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      {/* Base Image */}
      <div style={{ marginTop: 12 }}>
        <div
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
          onClick={() => setSectionOpen((s: any) => ({ ...s, baseSelect: !s.baseSelect }))}
        >
          <div style={{ fontWeight: 700 }}>Select Base Image</div>
          <div>{sectionOpen.baseSelect ? "▾" : "▸"}</div>
        </div>

        {sectionOpen.baseSelect && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>Base: NRW DOP orthophoto (WMS)</div>
            <button
              onClick={() => setViewMode("base")}
              style={{
                marginRight: 8,
                padding: "8px 10px",
                borderRadius: 8,
                background: viewMode === "base" ? "#c96a26" : "#fff",
                color: viewMode === "base" ? "#fff" : "#111",
                border: "1px solid #e6e6e6"
              }}
            >
              Use NRW
            </button>
            <button
              onClick={() => setViewMode("map")}
              style={{
                padding: "8px 10px",
                borderRadius: 8,
                background: viewMode === "map" ? "#c96a26" : "#fff",
                color: viewMode === "map" ? "#fff" : "#111",
                border: "1px solid #e6e6e6",
                marginLeft: 8
              }}
            >
              Use Map
            </button>
          </div>
        )}
      </div>

      {/* Define AOI */}
      <div style={{ marginTop: 14 }}>
        <div
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
          onClick={() => setSectionOpen((s: any) => ({ ...s, defineAOI: !s.defineAOI }))}
        >
          <div style={{ fontWeight: 700 }}>Define Area of Interest</div>
          <div>{sectionOpen.defineAOI ? "▾" : "▸"}</div>
        </div>

        {sectionOpen.defineAOI && (
          <>
            <div style={{ marginTop: 8 }}>
              <input
                value={searchQuery}
                onChange={handleInputChange}
                placeholder="Search Germany (city, state...)"
                style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #e6e6e6" }}
              />

              {suggestions.length > 0 && (
                <div style={{ marginTop: 6, maxHeight: 180, overflowY: "auto", borderRadius: 8, border: "1px solid #e6e6e6", background: "#fff" }}>
                  {suggestions.map((s, idx) => (
                    <div
                      key={idx}
                      onClick={() => applySuggestion(s)}
                      style={{ padding: 10, borderBottom: "1px solid rgba(0,0,0,0.04)", cursor: "pointer" }}
                    >
                      <div style={{ fontWeight: 700 }}>{String(s.display_name).split(",")[0]}</div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>{s.display_name}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
              <button
                onClick={applyOutlineAsBase}
                style={{ flex: 1, padding: 10, borderRadius: 8, background: "#c96a26", color: "#fff" }}
              >
                Apply outline as base image
              </button>
              <button
                onClick={confirmAOI}
                disabled={confirmDisabled}
                style={{
                  flex: 1,
                  padding: 10,
                  borderRadius: 8,
                  background: confirmDisabled ? "#94a3b8" : "#b85e1f",
                  color: "#fff"
                }}
              >
                Confirm Area
              </button>
            </div>
          </>
        )}
      </div>

      {/* AOI List */}
      <div style={{ marginTop: 14 }}>
        <div style={{ fontWeight: 700 }}>Areas</div>

        <div style={{ marginTop: 8 }}>
          {aois.length === 0 ? (
            <div style={{ padding: 8, color: "#6b7280" }}>No areas saved yet</div>
          ) : (
            aois.map(a => (
              <AreaRow
                key={a.id}
                aoi={a}
                onZoom={() => zoomToSaved(a)}
                onShow={() => showAOI(a)}
                onDelete={() => deleteAOI(a.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Define Objects (placeholder) */}
      <div style={{ marginTop: 14 }}>
        <div
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
          onClick={() => setSectionOpen((s: any) => ({ ...s, defineObjects: !s.defineObjects }))}
        >
          <div style={{ fontWeight: 700 }}>Define Objects</div>
          <div>{sectionOpen.defineObjects ? "▾" : "▸"}</div>
        </div>

        {sectionOpen.defineObjects && <div style={{ marginTop: 8, color: "#6b7280" }}>Object selection placeholder</div>}
      </div>
    </aside>
  );
}

/* ======================== AreaRow ======================== */

function AreaRow({
  aoi,
  onZoom,
  onShow,
  onDelete
}: {
  aoi: AOI;
  onZoom: () => void;
  onShow: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 8 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ width: 12, height: 12, background: "#c96a26", borderRadius: 2 }} />
          <div>
            <div style={{ fontWeight: 700 }}>{aoi.name}</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>{new Date(aoi.createdAt).toLocaleString()}</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={onShow} style={{ padding: "6px 8px", borderRadius: 6 }}>Show</button>
          <button onClick={onZoom} style={{ padding: "6px 8px", borderRadius: 6 }}>Zoom</button>
          <button onClick={onDelete} style={{ padding: "6px 8px", borderRadius: 6, background: "#ffe8e6", color: "#b91c1c" }}>
            Delete
          </button>
          <button onClick={() => setOpen(o => !o)} style={{ padding: "6px 8px", borderRadius: 6 }}>
            {open ? "▾" : "▸"}
          </button>
        </div>
      </div>

      {open && (
        <div style={{ padding: 8, background: "rgba(0,0,0,0.02)" }}>
          <div style={{ fontSize: 13 }}>Geometry: {aoi.geometry?.type || "—"}</div>
        </div>
      )}
    </div>
  );
}
