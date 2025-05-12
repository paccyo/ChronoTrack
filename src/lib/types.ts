export interface LocationPoint {
  timestamp: number; // Unix timestamp in seconds
  latitude: number;
  longitude: number;
}

export interface DeviceData {
  id: string;
  points: LocationPoint[];
}

// For rendering on map
export interface DevicePath extends DeviceData {
  color: string;
  currentPlaybackPosition?: { lat: number; lng: number };
}

export interface PlaybackState {
  isPlaying: boolean;
  speed: number; // multiplier, e.g., 1x, 2x
  currentTime: number; // Unix timestamp in seconds, progresses during playback
  startTime: number; // min timestamp from all data, in seconds
  endTime: number; // max timestamp from all data, in seconds
}
