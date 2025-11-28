
import MapViewer from './components/MapViewer/MapViewer';

export default function App() {
  return (
    <div className="app-shell">
      <div className="container">
        {/* <LeftRail />
        <Sidebar /> */}
        <main className="map-area bg-white rounded-lg shadow overflow-hidden">
          <MapViewer />
        </main>
      </div>
    </div>
  );
}
