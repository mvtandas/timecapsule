/**
 * Dark "Voorcap" map style for react-native-maps (PROVIDER_GOOGLE).
 * Tuned toward the prototype's mapBg (#0D1117) so the map reads as part of the
 * dark UI. Applied via the MapView `customMapStyle` prop (Google provider).
 */
export const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#0D1117' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#6b7280' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0D1117' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#1f2735' }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#bdb6a8' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#6b7280' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#11201a' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#3D9B7A' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#181E28' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#111620' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#6b7280' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#1f2735' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#11151c' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#181E28' }] },
  { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#6b7280' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#070b12' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3a4759' }] },
];

export default DARK_MAP_STYLE;
