import type { DeviceData } from './types';

const now = Date.now() / 1000; // current time in seconds

export const mockDeviceData: DeviceData[] = [
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

// Function to assign distinct colors for paths
const pathColors = ['#FF6347', '#4682B4', '#32CD32', '#FFD700', '#6A5ACD', '#FF69B4', '#00CED1'];
export const getDevicePathColors = (deviceIds: string[]): Record<string, string> => {
  const colorMap: Record<string, string> = {};
  deviceIds.forEach((id, index) => {
    colorMap[id] = pathColors[index % pathColors.length];
  });
  return colorMap;
};
