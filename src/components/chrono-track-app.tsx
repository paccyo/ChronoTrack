"use client";

import type { DevicePath, PlaybackState, DeviceData, LocationPoint } from '@/lib/types';
import { mockDeviceData, getDevicePathColors } from '@/lib/mock-data';
import { APIProvider } from '@vis.gl/react-google-maps';
import MapView from './map-view';
import IdFilter from './id-filter';
import PlaybackControls from './playback-controls';
import { Sidebar, SidebarProvider, SidebarContent, SidebarHeader, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, MapPinned } from "lucide-react";

// Helper function to interpolate position
const interpolatePosition = (p1: LocationPoint, p2: LocationPoint, currentTime: number): { lat: number; lng: number } => {
  const t0 = p1.timestamp;
  const t1 = p2.timestamp;
  
  if (currentTime <= t0) return { lat: p1.latitude, lng: p1.longitude };
  if (currentTime >= t1) return { lat: p2.latitude, lng: p2.longitude };
  if (t1 === t0) return { lat: p1.latitude, lng: p1.longitude }; // Avoid division by zero

  const factor = (currentTime - t0) / (t1 - t0);
  return {
    lat: p1.latitude + (p2.latitude - p1.latitude) * factor,
    lng: p1.longitude + (p2.longitude - p1.longitude) * factor,
  };
};

export default function ChronoTrackApp() {
  const [allDeviceData, setAllDeviceData] = useState<DeviceData[]>([]);
  const [devicePaths, setDevicePaths] = useState<DevicePath[]>([]);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([]);
  const [playbackState, setPlaybackState] = useState<PlaybackState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call

        if (!mockDeviceData || mockDeviceData.length === 0) {
          setError("No device data found. Please check your data source or add data to mock-data.ts.");
          setAllDeviceData([]);
          setIsLoading(false);
          return;
        }
        
        setAllDeviceData(mockDeviceData);
        const allIds = mockDeviceData.map(d => d.id);
        setSelectedDeviceIds(allIds); 

        let minTimestamp = Infinity;
        let maxTimestamp = -Infinity;
        let hasPoints = false;
        mockDeviceData.forEach(device => {
          if (device.points && device.points.length > 0) {
            hasPoints = true;
            device.points.forEach(point => {
              if (point.timestamp < minTimestamp) minTimestamp = point.timestamp;
              if (point.timestamp > maxTimestamp) maxTimestamp = point.timestamp;
            });
          }
        });
        
        if (!hasPoints) {
          setError("Data loaded, but no location points found to display.");
          minTimestamp = Date.now() / 1000;
          maxTimestamp = Date.now() / 1000;
        } else if (minTimestamp === Infinity || maxTimestamp === -Infinity) {
           setError("Invalid timestamp data found.");
           minTimestamp = Date.now() / 1000;
           maxTimestamp = Date.now() / 1000;
        }


        setPlaybackState({
          isPlaying: false,
          speed: 1,
          currentTime: minTimestamp,
          startTime: minTimestamp,
          endTime: maxTimestamp,
        });
      } catch (e) {
        console.error("Failed to fetch data:", e);
        setError("Failed to load device data. Please try again later.");
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
        // Initialize currentPlaybackPosition to the first point if available
        currentPlaybackPosition: device.points && device.points.length > 0 
          ? { lat: device.points[0].latitude, lng: device.points[0].longitude } 
          : undefined,
      }));
      setDevicePaths(paths);
    }
  }, [allDeviceData]);

  // Playback animation loop
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
        
        const scaledDeltaTime = deltaTime * prevPbState.speed * 60; // Data seconds per real second
        let newCurrentTime = prevPbState.currentTime + scaledDeltaTime;

        if (newCurrentTime >= prevPbState.endTime) {
          newCurrentTime = prevPbState.endTime;
          // Stop playback at the end
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
            // Fallback, should ideally be covered by checks above
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
  }, [playbackState?.isPlaying, playbackState?.speed, playbackState?.currentTime, playbackState?.endTime, devicePaths]);


  const handlePlayPause = useCallback(() => {
    setPlaybackState(prev => {
      if (!prev) return null;
      if (prev.currentTime >= prev.endTime && !prev.isPlaying) { // If at end and paused, reset and play
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
            const lastPoint = path.points[path.points.length -1];
            return { ...path, currentPlaybackPosition: { lat: lastPoint.latitude, lng: lastPoint.longitude }};
          })
        );
        return { ...prev, currentTime: newTime, isPlaying: false }; // Pause on scrub
     });
  }, []);

  const filteredPaths = useMemo(() => {
    return devicePaths.filter(path => selectedDeviceIds.includes(path.id));
  }, [devicePaths, selectedDeviceIds]);

  const allIds = useMemo(() => allDeviceData.map(d => d.id), [allDeviceData]);

  if (!googleMapsApiKey) {
    return (
      <div className="flex h-full items-center justify-center p-4 bg-background">
        <Alert variant="destructive" className="max-w-md shadow-lg">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle>Configuration Error</AlertTitle>
          <AlertDescription>
            Google Maps API Key is missing. Please set <code className="font-mono bg-muted px-1 py-0.5 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in your <code className="font-mono bg-muted px-1 py-0.5 rounded">.env.local</code> file.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <APIProvider apiKey={googleMapsApiKey} solutionChannel="GMP_QB_chronotrack_v1_c">
      <SidebarProvider>
        <Sidebar collapsible="icon" className="shadow-lg border-r border-sidebar-border">
          <SidebarHeader>
            <div className="flex items-center gap-3 p-3 rounded-lg">
              <MapPinned className="h-8 w-8 text-primary" />
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
              </>
            ) : (
              <>
                <Card className="shadow-md">
                  <CardHeader>
                    <CardTitle className="text-lg">Device IDs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {error && !allIds.length ? (
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
                {playbackState && !error && ( // Only show playback if no major data error
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
                 {error && allIds.length > 0 && ( // Show error even if some IDs are loaded but other issues exist
                    <Alert variant="destructive" className="mt-4">
                        <AlertTriangle className="h-4 w-4"/>
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
              </>
            )}
          </SidebarContent>
        </Sidebar>
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
                    <p className="text-md text-foreground">Loading Map Data...</p>
                </div>
              </div>
          ) : (
            <MapView paths={filteredPaths} playbackActive={playbackState?.isPlaying ?? false} />
          )}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </APIProvider>
  );
}
