
import MapViewer from './components/MapViewer/MapViewerEnhanced';

export default function App() {
  return (
    <div className="app-shell">
      <div className="container">
        <main className="map-area bg-white rounded-lg shadow overflow-hidden">
          <MapViewer />
        </main>
      </div>
    </div>
  );
}
