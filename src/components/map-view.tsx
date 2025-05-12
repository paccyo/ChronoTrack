"use client";

import type { DevicePath } from '@/lib/types';
import { Map, Marker, Polyline, ControlPosition, MapControl, useMap } from '@vis.gl/react-google-maps';
import React, { useMemo, useEffect } from 'react';

interface MapViewProps {
  paths: DevicePath[];
  playbackActive: boolean;
}

const MapView: React.FC<MapViewProps> = ({ paths, playbackActive }) => {
  const map = useMap();

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
    if (map && bounds) {
      // Add a little padding to the bounds
      map.fitBounds(bounds, 50); 
    }
  }, [map, bounds]);

  const mapOptions = useMemo(() => {
    if (bounds && !bounds.isEmpty()) {
      const center = bounds.getCenter();
      return { 
        center: { lat: center.lat(), lng: center.lng() }, 
        // Zoom will be set by fitBounds
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
      center: { lat: 37.0902, lng: -95.7129 }, zoom: 4, // Default US center
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
              <Polyline
                path={path.points.map(p => ({ lat: p.latitude, lng: p.longitude }))}
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
