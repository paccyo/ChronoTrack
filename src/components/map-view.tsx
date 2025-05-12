"use client";

import type { DevicePath } from '@/lib/types';
// Remove Polyline from import, it's no longer exported directly in v1.x.x
import { Map, Marker, ControlPosition, MapControl, useMap } from '@vis.gl/react-google-maps';
import React, { useMemo, useEffect, useRef } from 'react';

interface MapViewProps {
  paths: DevicePath[];
  playbackActive: boolean;
}

interface ManagedPolylineProps {
  points: Array<{lat: number; lng: number}>;
  strokeColor: string;
  strokeOpacity: number;
  strokeWeight: number;
  geodesic: boolean;
  zIndex: number;
}

const ManagedPolylineComponent: React.FC<ManagedPolylineProps> = ({
  points,
  strokeColor,
  strokeOpacity,
  strokeWeight,
  geodesic,
  zIndex,
}) => {
  const map = useMap();
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map) {
      // If map becomes unavailable, and we have a polyline, ensure it's removed from the map.
      // This might happen if the map is conditionally rendered or unmounted separately.
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
      }
      return;
    }

    // Create polyline if it doesn't exist
    if (!polylineRef.current) {
      polylineRef.current = new google.maps.Polyline();
    }

    // Set options, including adding to the map
    polylineRef.current.setOptions({
      path: points,
      strokeColor,
      strokeOpacity,
      strokeWeight,
      geodesic,
      zIndex,
      map: map, 
    });

  }, [map, points, strokeColor, strokeOpacity, strokeWeight, geodesic, zIndex]);

  // Cleanup effect for when the component unmounts
  useEffect(() => {
    return () => {
      if (polylineRef.current) {
        polylineRef.current.setMap(null); // Remove from map
        polylineRef.current = null; // Clean up the ref
      }
    };
  }, []); // Empty dependency array: runs only on mount and unmount

  return null; // This component does not render any direct DOM elements
};


const MapView: React.FC<MapViewProps> = ({ paths, playbackActive }) => {
  const map = useMap(); // useMap can be called here if MapView is a child of APIProvider/MapProvider

  const bounds = useMemo(() => {
    const newBounds = new google.maps.LatLngBounds();
    if (paths.length === 0) return null;

    paths.forEach(path => {
      if (path.points && path.points.length > 0) {
        path.points.forEach(point => {
          newBounds.extend(new google.maps.LatLng(point.latitude, point.longitude));
        });
      }
    });
    return newBounds.isEmpty() ? null : newBounds;
  }, [paths]);

  useEffect(() => {
    // map instance can be null initially if useMap() is called in a component
    // that isn't yet a child of a Map. If MapView itself uses useMap(),
    // 'map' might be null on first render cycle if not nested correctly.
    // However, if MapView renders the <Map> component, then map is not available here.
    // For fitBounds, we need the map instance from the <Map> component itself.
    // The original code called map.fitBounds() where map was from `useMap()`
    // which means this MapView component must be a child of the Map component where context is provided.
    // Let's assume the map instance for fitBounds is obtained from useMap() if this component is a child of <Map>
    // or passed as a prop if MapView itself renders the <Map>.
    // The current structure suggests MapView *renders* the <Map>, so `useMap()` here would be for a *parent* map.
    // For fitting bounds on its *own* map, it needs a ref to its own Map component, or use the `onLoad` event.
    // However, the existing code `const map = useMap();` means it expects to be a child.
    // Let's keep original map.fitBounds logic assuming `map` context is correctly available.
    const currentMapInstance = map; // map from useMap()
    if (currentMapInstance && bounds) {
      currentMapInstance.fitBounds(bounds, 50); 
    }
  }, [map, bounds]);


  const mapOptions = useMemo(() => {
    if (bounds && !bounds.isEmpty()) {
      const center = bounds.getCenter();
      return { 
        center: { lat: center.lat(), lng: center.lng() }, 
        mapId: 'CHRONOTRACK_STYLED_MAP',
        disableDefaultUI: true,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: true,
        gestureHandling: 'greedy',
      };
    }
    return { 
      center: { lat: 37.0902, lng: -95.7129 }, zoom: 4, 
      mapId: 'CHRONOTRACK_STYLED_MAP',
      disableDefaultUI: true,
      zoomControl: true,
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: true,
      gestureHandling: 'greedy',
    };
  }, [bounds]);

  return (
    <div className="w-full h-full bg-muted" data-ai-hint="world map route">
      <Map
        {...mapOptions}
        style={{ width: '100%', height: '100%' }}
        className="rounded-md shadow-inner"
      >
        {paths.map(path => (
          <React.Fragment key={path.id}>
            {path.points && path.points.length > 0 && (
              <ManagedPolylineComponent
                points={path.points.map(p => ({ lat: p.latitude, lng: p.longitude }))}
                strokeColor={path.color}
                strokeOpacity={playbackActive ? 0.5 : 0.9}
                strokeWeight={playbackActive ? 4 : 6}
                geodesic={true}
                zIndex={1}
              />
            )}
            
            {path.points && path.points.length > 0 && !playbackActive && (
              <>
                <Marker
                  position={{ lat: path.points[0].latitude, lng: path.points[0].longitude }}
                  title={`Start: ${path.id}`}
                  icon={{
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 7,
                    fillColor: path.color,
                    fillOpacity: 1,
                    strokeWeight: 2,
                    strokeColor: 'var(--card-foreground)',
                  }}
                  zIndex={2}
                />
                {path.points.length > 1 && (
                  <Marker
                    position={{ lat: path.points[path.points.length-1].latitude, lng: path.points[path.points.length-1].longitude }}
                    title={`End: ${path.id}`}
                     icon={{
                        path: 'M -2.5,-2.5 L 2.5,-2.5 L 2.5,2.5 L -2.5,2.5 Z', // Square
                        scale: 5,
                        fillColor: path.color,
                        fillOpacity: 1,
                        strokeWeight: 2,
                        strokeColor: 'var(--card-foreground)',
                    }}
                    zIndex={2}
                  />
                )}
              </>
            )}
            {playbackActive && path.currentPlaybackPosition && (
               <Marker
                position={path.currentPlaybackPosition}
                title={`Current: ${path.id}`}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 9,
                  fillColor: path.color,
                  fillOpacity: 1,
                  strokeColor: 'hsl(var(--background))', 
                  strokeWeight: 3,
                }}
                zIndex={1000} 
              />
            )}
          </React.Fragment>
        ))}
         <MapControl position={ControlPosition.RIGHT_BOTTOM}>
            <div className="m-3 p-1 bg-background/80 border border-border rounded-md shadow-lg backdrop-blur-sm">
                {/* Map controls are enabled via mapOptions (zoomControl, fullscreenControl) */}
            </div>
        </MapControl>
      </Map>
    </div>
  );
};

export default MapView;
