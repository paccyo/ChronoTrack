
"use client";

import type { DevicePath, PlaybackState, DeviceData, LocationPoint } from '@/lib/types';
// import { mockDeviceData, getDevicePathColors } from '@/lib/mock-data'; // No longer using mock data
import CoordinatePlaneView from './coordinate-plane-view';
import IdFilter from './id-filter';
import PlaybackControls from './playback-controls';
import { Sidebar, SidebarProvider, SidebarContent, SidebarHeader, SidebarTrigger, SidebarInset, SidebarRail } from '@/components/ui/sidebar';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, LineChart } from "lucide-react";
import DeviceDataPointsList from './device-data-points-list';

import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, Timestamp as FirestoreTimestamp } from 'firebase/firestore';

// Helper function to interpolate position
const interpolatePosition = (p1: LocationPoint, p2: LocationPoint, currentTime: number): { lat: number; lng: number } => {
  const t0 = p1.timestamp;
  const t1 = p2.timestamp;
  
  if (currentTime <= t0) return { lat: p1.latitude, lng: p1.longitude };
  if (currentTime >= t1) return { lat: p2.latitude, lng: p2.longitude };
  if (t1 === t0) return { lat: p1.latitude, lng: p1.longitude };

  const factor = (currentTime - t0) / (t1 - t0);
  return {
    lat: p1.latitude + (p2.latitude - p1.latitude) * factor,
    lng: p1.longitude + (p2.longitude - p1.longitude) * factor,
  };
};

// Moved getDevicePathColors here
const pathColors = ['#FF6347', '#4682B4', '#32CD32', '#FFD700', '#6A5ACD', '#FF69B4', '#00CED1'];
const getDevicePathColors = (deviceIds: string[]): Record<string, string> => {
  const colorMap: Record<string, string> = {};
  deviceIds.forEach((id, index) => {
    colorMap[id] = pathColors[index % pathColors.length];
  });
  return colorMap;
};


export default function ChronoTrackApp() {
  const [allDeviceData, setAllDeviceData] = useState<DeviceData[]>([]);
  const [devicePaths, setDevicePaths] = useState<DevicePath[]>([]);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([]);
  const [playbackState, setPlaybackState] = useState<PlaybackState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (!db) {
          setError("Firestore is not initialized. Please check your Firebase configuration.");
          setAllDeviceData([]);
          setPlaybackState(null);
          setIsLoading(false);
          return;
        }
        
        const devicesCollectionRef = collection(db, 'devices');
        const deviceQuerySnapshot = await getDocs(devicesCollectionRef);

        if (deviceQuerySnapshot.empty) {
          setError("No devices found in Firestore. Please add device data. Structure: /devices/{deviceId} with a subcollection 'points' containing documents with 'timestamp' (Timestamp), 'latitude' (number), 'longitude' (number).");
          setAllDeviceData([]);
          setPlaybackState({
            isPlaying: false,
            speed: 1,
            currentTime: Math.floor(Date.now() / 1000),
            startTime: Math.floor(Date.now() / 1000),
            endTime: Math.floor(Date.now() / 1000),
          });
          setIsLoading(false);
          return;
        }

        const fetchedDeviceData: DeviceData[] = [];
        for (const deviceDoc of deviceQuerySnapshot.docs) {
          const deviceId = deviceDoc.id;
          const pointsCollectionRef = collection(db, `devices/${deviceId}/points`);
          const pointsQuery = query(pointsCollectionRef, orderBy('timestamp', 'asc')); 
          const pointsQuerySnapshot = await getDocs(pointsQuery);

          const points: LocationPoint[] = pointsQuerySnapshot.docs.map(pointDoc => {
            const data = pointDoc.data();
            const firestoreTimestamp = data.timestamp as FirestoreTimestamp; 
            return {
              timestamp: firestoreTimestamp.seconds, 
              latitude: data.latitude as number,
              longitude: data.longitude as number,
            };
          });
          
          if (points.length > 0) {
             fetchedDeviceData.push({
                id: deviceId,
                points: points,
              });
          } else {
            console.warn(`Device ${deviceId} found in Firestore but has no location points in its 'points' subcollection.`);
          }
        }
        
        if (fetchedDeviceData.length === 0) {
          setError("Found devices in Firestore, but none have location data points. Ensure 'points' subcollections are populated with valid data.");
          setAllDeviceData([]);
           setPlaybackState({
            isPlaying: false,
            speed: 1,
            currentTime: Math.floor(Date.now() / 1000),
            startTime: Math.floor(Date.now() / 1000),
            endTime: Math.floor(Date.now() / 1000),
          });
          setIsLoading(false);
          return;
        }
        
        setAllDeviceData(fetchedDeviceData);
        const allIds = fetchedDeviceData.map(d => d.id);
        setSelectedDeviceIds(allIds); 

        let minTimestamp = Infinity;
        let maxTimestamp = -Infinity;
        let hasPoints = false;
        fetchedDeviceData.forEach(device => {
          if (device.points && device.points.length > 0) {
            hasPoints = true;
            device.points.forEach(point => {
              if (point.timestamp < minTimestamp) minTimestamp = point.timestamp;
              if (point.timestamp > maxTimestamp) maxTimestamp = point.timestamp;
            });
          }
        });
        
        if (!hasPoints) {
          setError("Firestore data loaded, but no usable location points found to display.");
          minTimestamp = Math.floor(Date.now() / 1000);
          maxTimestamp = Math.floor(Date.now() / 1000);
        } else if (minTimestamp === Infinity || maxTimestamp === -Infinity) {
           setError("Invalid timestamp data encountered in Firestore records.");
           minTimestamp = Math.floor(Date.now() / 1000);
           maxTimestamp = Math.floor(Date.now() / 1000);
        }

        setPlaybackState({
          isPlaying: false,
          speed: 1,
          currentTime: minTimestamp,
          startTime: minTimestamp,
          endTime: maxTimestamp,
        });
      } catch (e: any) {
        console.error("Failed to fetch data from Firestore:", e);
        setError(`Failed to load device data from Firestore: ${e.message || 'Unknown error'}. Check console and Firestore rules.`);
        setAllDeviceData([]);
        setPlaybackState(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (allDeviceData.length > 0) {
      const colors = getDevicePathColors(allDeviceData.map(d => d.id));
      const paths = allDeviceData.map(device => ({
        ...device,
        color: colors[device.id] || '#CCCCCC',
        currentPlaybackPosition: device.points && device.points.length > 0 
          ? { lat: device.points[0].latitude, lng: device.points[0].longitude } 
          : undefined,
      }));
      setDevicePaths(paths);
    } else {
      setDevicePaths([]); // Clear paths if no device data
    }
  }, [allDeviceData]);

  useEffect(() => {
    if (!playbackState || !playbackState.isPlaying || !devicePaths.length) {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
      return;
    }

    let lastAnimationTimestamp: number | undefined;

    const animate = (currentAnimationTimestamp: number) => {
      setPlaybackState(prevPbState => {
        if (!prevPbState || !prevPbState.isPlaying) return prevPbState;

        const deltaTime = lastAnimationTimestamp ? (currentAnimationTimestamp - lastAnimationTimestamp) / 1000 : 0;
        lastAnimationTimestamp = currentAnimationTimestamp;
        
        const scaledDeltaTime = deltaTime * prevPbState.speed * 60;
        let newCurrentTime = prevPbState.currentTime + scaledDeltaTime;

        if (newCurrentTime >= prevPbState.endTime) {
          newCurrentTime = prevPbState.endTime;
          setDevicePaths(currentPaths => 
            currentPaths.map(path => {
              if (!path.points || path.points.length === 0) return path;
              const lastPoint = path.points[path.points.length - 1];
              return { ...path, currentPlaybackPosition: { lat: lastPoint.latitude, lng: lastPoint.longitude } };
            })
          );
          return { ...prevPbState, isPlaying: false, currentTime: newCurrentTime };
        }
        
        setDevicePaths(currentPaths => 
          currentPaths.map(path => {
            if (!path.points || path.points.length < 1) return path;
            if (path.points.length === 1) return {...path, currentPlaybackPosition: { lat: path.points[0].latitude, lng: path.points[0].longitude } };

            if (newCurrentTime < path.points[0].timestamp) {
              return { ...path, currentPlaybackPosition: { lat: path.points[0].latitude, lng: path.points[0].longitude }};
            }
            if (newCurrentTime > path.points[path.points.length -1].timestamp) {
              return { ...path, currentPlaybackPosition: { lat: path.points[path.points.length-1].latitude, lng: path.points[path.points.length-1].longitude }};
            }
            
            for (let i = 0; i < path.points.length - 1; i++) {
              const p1 = path.points[i];
              const p2 = path.points[i+1];
              if (newCurrentTime >= p1.timestamp && newCurrentTime <= p2.timestamp) {
                return { ...path, currentPlaybackPosition: interpolatePosition(p1, p2, newCurrentTime) };
              }
            }
            // Fallback if no segment found (should ideally not happen if logic is correct and newCurrentTime is within bounds)
            const lastPoint = path.points[path.points.length -1];
            return { ...path, currentPlaybackPosition: { lat: lastPoint.latitude, lng: lastPoint.longitude }};
          })
        );
        return { ...prevPbState, currentTime: newCurrentTime };
      });
      animationFrameIdRef.current = requestAnimationFrame(animate);
    };

    animationFrameIdRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
    };
  }, [playbackState?.isPlaying, playbackState?.speed, playbackState?.currentTime, playbackState?.endTime, devicePaths]); // devicePaths dependency is important here


  const handlePlayPause = useCallback(() => {
    setPlaybackState(prev => {
      if (!prev) return null;
      if (prev.currentTime >= prev.endTime && !prev.isPlaying) {
        setDevicePaths(currentPaths => 
          currentPaths.map(path => ({
            ...path,
            currentPlaybackPosition: path.points && path.points.length > 0 ? { lat: path.points[0].latitude, lng: path.points[0].longitude } : undefined
          }))
        );
        return { ...prev, isPlaying: true, currentTime: prev.startTime };
      }
      return { ...prev, isPlaying: !prev.isPlaying };
    });
  }, []);

  const handleSpeedChange = useCallback((newSpeed: number) => {
    setPlaybackState(prev => prev ? { ...prev, speed: newSpeed } : null);
  }, []);

  const handleTimeScrub = useCallback((newTime: number) => {
     setPlaybackState(prev => {
        if (!prev) return null;
        setDevicePaths(currentPaths => 
          currentPaths.map(path => {
            if (!path.points || path.points.length < 1) return path;
            if (path.points.length === 1) return {...path, currentPlaybackPosition: { lat: path.points[0].latitude, lng: path.points[0].longitude } };

            if (newTime < path.points[0].timestamp) {
              return { ...path, currentPlaybackPosition: { lat: path.points[0].latitude, lng: path.points[0].longitude }};
            }
            if (newTime > path.points[path.points.length -1].timestamp) {
              return { ...path, currentPlaybackPosition: { lat: path.points[path.points.length-1].latitude, lng: path.points[path.points.length-1].longitude }};
            }
            for (let i = 0; i < path.points.length - 1; i++) {
              const p1 = path.points[i];
              const p2 = path.points[i+1];
              if (newTime >= p1.timestamp && newTime <= p2.timestamp) {
                return { ...path, currentPlaybackPosition: interpolatePosition(p1, p2, newTime) };
              }
            }
             // Fallback if no segment found
            const lastPoint = path.points[path.points.length -1];
            return { ...path, currentPlaybackPosition: { lat: lastPoint.latitude, lng: lastPoint.longitude }};
          })
        );
        return { ...prev, currentTime: newTime, isPlaying: false }; 
     });
  }, []);

  const filteredPaths = useMemo(() => {
    return devicePaths.filter(path => selectedDeviceIds.includes(path.id));
  }, [devicePaths, selectedDeviceIds]);

  const allIds = useMemo(() => allDeviceData.map(d => d.id), [allDeviceData]);

  return (
      <SidebarProvider>
        <Sidebar collapsible="icon" className="shadow-lg border-r border-sidebar-border">
          <SidebarHeader>
            <div className="flex items-center gap-3 p-3 rounded-lg">
              <LineChart className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold text-foreground group-data-[collapsible=icon]:hidden">ChronoTrack</h1>
            </div>
          </SidebarHeader>
          <SidebarContent className="p-2 space-y-4">
            {isLoading ? (
              <>
                <Skeleton className="h-10 w-full mb-2" />
                <Skeleton className="h-24 w-full mb-4" />
                <Skeleton className="h-10 w-full mb-2" />
                <Skeleton className="h-36 w-full" />
                <Skeleton className="h-48 w-full mt-4" /> 
              </>
            ) : (
              <>
                <Card className="shadow-md">
                  <CardHeader>
                    <CardTitle className="text-lg">Device IDs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {error && !allIds.length ? ( // Show error related to loading if no IDs are present
                       <Alert variant="default" className="bg-card">
                        <AlertTriangle className="h-4 w-4"/>
                        <AlertTitle>Notice</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    ) : (
                      <IdFilter
                        allIds={allIds}
                        selectedIds={selectedDeviceIds}
                        onSelectionChange={setSelectedDeviceIds}
                      />
                    )}
                  </CardContent>
                </Card>
                {playbackState && !error && ( // Only show playback if state is valid and no initial load error blocked it
                 <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle className="text-lg">Playback Controls</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <PlaybackControls
                        playbackState={playbackState}
                        onPlayPause={handlePlayPause}
                        onSpeedChange={handleSpeedChange}
                        onTimeScrub={handleTimeScrub}
                        />
                    </CardContent>
                 </Card>
                )}
                 {error && allIds.length > 0 && ( // Show error specifically if data loading failed but IDs might have been populated before
                    <Alert variant="destructive" className="mt-4">
                        <AlertTriangle className="h-4 w-4"/>
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                {playbackState && filteredPaths.length > 0 && ( // Ensure playbackState is not null
                  <DeviceDataPointsList paths={filteredPaths} playbackCurrentTime={playbackState.currentTime} />
                )}
              </>
            )}
          </SidebarContent>
        </Sidebar>
        <SidebarRail />
        <SidebarInset className="flex flex-col bg-background">
          <header className="p-3 border-b bg-background flex items-center gap-2 md:hidden shadow-sm">
            <SidebarTrigger />
            <h2 className="text-lg font-semibold text-foreground">ChronoTrack</h2>
          </header>
          <div className="flex-grow relative">
          {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm z-10">
                <div className="flex flex-col items-center space-y-3">
                    <svg className="animate-spin h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-md text-foreground">Loading Path Data from Firestore...</p>
                </div>
              </div>
          ) : error && filteredPaths.length === 0 ? ( // If error and no paths, show error in main view too
            <div className="w-full h-full flex items-center justify-center bg-muted rounded-md shadow-inner">
                <Alert variant="destructive" className="max-w-md">
                    <AlertTriangle className="h-4 w-4"/>
                    <AlertTitle>Data Loading Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </div>
          ) : (
            <CoordinatePlaneView paths={filteredPaths} playbackActive={playbackState?.isPlaying ?? false} />
          )}
          </div>
        </SidebarInset>
      </SidebarProvider>
  );
}

    
