import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type LatLng = { lat: number; lng: number };

export interface MapMiniProps {
  center: LatLng;
  userMarker?: LatLng;
  restaurants?: Array<{ id: string; name: string; lat: number; lng: number }>;
  onSelect?: (id: string) => void;
  height?: number;
  zoom?: number;
}

const defaultIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const MapMini: React.FC<MapMiniProps> = ({
  center,
  userMarker,
  restaurants = [],
  onSelect,
  height = 240,
  zoom = 14,
}) => {
  return (
    <div style={{ height }} className="rounded overflow-hidden border">
      <MapContainer center={[center.lat, center.lng]} zoom={zoom} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {userMarker && (
          <Marker position={[userMarker.lat, userMarker.lng]} icon={defaultIcon}>
            <Popup>User location</Popup>
          </Marker>
        )}

        {restaurants.map((r) => (
          <Marker key={r.id} position={[r.lat, r.lng]} icon={defaultIcon} eventHandlers={{ click: () => onSelect && onSelect(r.id) }}>
            <Popup>{r.name}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default MapMini;


