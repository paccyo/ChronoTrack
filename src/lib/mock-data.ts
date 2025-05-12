
import type { DeviceData } from './types';

// const now = Date.now() / 1000; // current time in seconds

// Mock data is no longer used as the primary source. Data is fetched from Firestore.
// This can be used as a reference for the data structure or for local testing if Firestore is unavailable.
/*
const mockDeviceData: DeviceData[] = [
  {
    id: 'AlphaTrack-001',
    points: [
      { timestamp: now - 300, latitude: 34.0522, longitude: -118.2437 }, // Los Angeles
      { timestamp: now - 240, latitude: 34.0530, longitude: -118.2445 },
      { timestamp: now - 180, latitude: 34.0540, longitude: -118.2455 },
      { timestamp: now - 120, latitude: 34.0550, longitude: -118.2465 },
      { timestamp: now - 60, latitude: 34.0560, longitude: -118.2475 },
      { timestamp: now, latitude: 34.0570, longitude: -118.2485 },
    ],
  },
  // {
  //   id: 'BetaRover-007',
  //   points: [
  //     { timestamp: now - 330, latitude: 40.7128, longitude: -74.0060 }, // New York City
  //     { timestamp: now - 270, latitude: 40.7135, longitude: -74.0072 },
  //     { timestamp: now - 210, latitude: 40.7142, longitude: -74.0085 },
  //     { timestamp: now - 150, latitude: 40.7150, longitude: -74.0095 },
  //     { timestamp: now - 90, latitude: 40.7158, longitude: -74.0105 },
  //     { timestamp: now - 30, latitude: 40.7166, longitude: -74.0115 },
  //   ],
  // },
  // {
  //   id: 'GammaGlide-X',
  //   points: [
  //     { timestamp: now - 280, latitude: 37.7749, longitude: -122.4194 }, // San Francisco
  //     { timestamp: now - 220, latitude: 37.7759, longitude: -122.4204 },
  //     { timestamp: now - 160, latitude: 37.7769, longitude: -122.4214 },
  //     { timestamp: now - 100, latitude: 37.7779, longitude: -122.4224 },
  //     { timestamp: now - 40, latitude: 37.7789, longitude: -122.4234 },
  //   ],
  // }
];
*/

// The getDevicePathColors function and pathColors array have been moved to src/components/chrono-track-app.tsx
// as they are closely tied to the presentation logic there and mockDeviceData is no longer the primary data source.

    