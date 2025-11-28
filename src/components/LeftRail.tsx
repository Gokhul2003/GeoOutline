import React from 'react';

export default function LeftRail() {
  return (
    <div className="left-rail">
      <div className="rail-btn" title="Back">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 11l18-8-8 18-3-7-7-3z" fill="#6b3fa7"/></svg>
      </div>

      <div className="rail-btn" title="Home">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9z" fill="#6b3fa7"/></svg>
      </div>

      <div className="rail-btn" title="Layers">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2l10 6-10 6L2 8l10-6zM2 13l10 6 10-6" stroke="#6b3fa7" strokeWidth="1.2" /></svg>
      </div>

      <div style={{ flex: 1 }} />

      <div className="rail-btn" title="Profile">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3" fill="#6b3fa7"/><path d="M5 20a7 7 0 0 1 14 0" stroke="#6b3fa7" strokeWidth="1.2"/></svg>
      </div>

      <div className="rail-btn" title="Settings">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" stroke="#6b3fa7" strokeWidth="1.2"/></svg>
      </div>
    </div>
  );
}
