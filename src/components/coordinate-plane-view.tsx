
"use client";

import type { DevicePath } from '@/lib/types';
import React, { useMemo, useRef, useEffect, useState } from 'react';

interface CoordinatePlaneViewProps {
  paths: DevicePath[];
  playbackActive: boolean;
}

const CoordinatePlaneView: React.FC<CoordinatePlaneViewProps> = ({ paths, playbackActive }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    window.addEventListener('resize', updateSize);
    updateSize(); // Initial size
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const dataBounds = useMemo(() => {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let hasPoints = false;

    paths.forEach(path => {
      if (path.points && path.points.length > 0) {
        hasPoints = true;
        path.points.forEach(point => {
          minX = Math.min(minX, point.longitude);
          maxX = Math.max(maxX, point.longitude);
          minY = Math.min(minY, point.latitude);
          maxY = Math.max(maxY, point.latitude);
        });
      }
    });

    if (!hasPoints) return null;

    // Add padding if range is zero
    if (minX === maxX) {
        minX -= 0.5;
        maxX += 0.5;
    }
    if (minY === maxY) {
        minY -= 0.5;
        maxY += 0.5;
    }
    
    return { minX, maxX, minY, maxY };
  }, [paths]);

  const transformCoordinates = (lng: number, lat: number) => {
    if (!dataBounds || containerSize.width === 0 || containerSize.height === 0) {
      return { x: 0, y: 0 };
    }

    const padding = 40; // SVG padding
    const Gutter = 20; // Min gutter if no padding
    const svgWidth = Math.max(containerSize.width - 2 * padding, Gutter);
    const svgHeight = Math.max(containerSize.height - 2 * padding, Gutter);
    
    const rangeX = dataBounds.maxX - dataBounds.minX;
    const rangeY = dataBounds.maxY - dataBounds.minY;

    const scaleX = rangeX === 0 ? 1 : svgWidth / rangeX;
    const scaleY = rangeY === 0 ? 1 : svgHeight / rangeY;
    
    // Use the smaller scale to maintain aspect ratio, centered
    const scale = Math.min(scaleX, scaleY);

    const dataWidthScaled = rangeX * scale;
    const dataHeightScaled = rangeY * scale;
    
    const offsetX = (svgWidth - dataWidthScaled) / 2 + padding;
    const offsetY = (svgHeight - dataHeightScaled) / 2 + padding;

    const x = offsetX + (lng - dataBounds.minX) * scale;
    // Invert Y-axis: SVG Y is top-to-bottom, Latitude is bottom-to-top
    const y = offsetY + (dataBounds.maxY - lat) * scale; 
    
    return { x, y };
  };


  if (!dataBounds) {
    return (
      <div ref={containerRef} className="w-full h-full flex items-center justify-center bg-muted rounded-md shadow-inner" data-ai-hint="empty data plot">
        <p className="text-muted-foreground">No data to display or insufficient points for bounds.</p>
      </div>
    );
  }
  
  const { width: containerWidth, height: containerHeight } = containerSize;

  return (
    <div ref={containerRef} className="w-full h-full bg-card rounded-md shadow-inner overflow-hidden" data-ai-hint="data plot graph">
      {containerWidth > 0 && containerHeight > 0 && (
        <svg width={containerWidth} height={containerHeight} className="rounded-md">
          <rect width="100%" height="100%" fill="hsl(var(--muted))" />
          {/* Paths */}
          {paths.map(path => {
            if (!path.points || path.points.length === 0) return null;
            const SvgPoints = path.points.map(p => {
              const { x, y } = transformCoordinates(p.longitude, p.latitude);
              return `${x},${y}`;
            }).join(' ');

            return (
              <polyline
                key={path.id}
                points={SvgPoints}
                stroke={path.color}
                strokeWidth={playbackActive ? 2 : 3}
                fill="none"
                opacity={playbackActive ? 0.7 : 0.9}
              />
            );
          })}

          {/* Markers */}
          {paths.map(path => {
            if (!path.points || path.points.length === 0) return null;
            
            if (playbackActive && path.currentPlaybackPosition) {
              const { x, y } = transformCoordinates(path.currentPlaybackPosition.lng, path.currentPlaybackPosition.lat);
              return (
                <circle
                  key={`current-${path.id}`}
                  cx={x}
                  cy={y}
                  r={6}
                  fill={path.color}
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                />
              );
            } else {
              const startPoint = path.points[0];
              const endPoint = path.points[path.points.length - 1];
              const { x: startX, y: startY } = transformCoordinates(startPoint.longitude, startPoint.latitude);
              const { x: endX, y: endY } = transformCoordinates(endPoint.longitude, endPoint.latitude);

              return (
                <React.Fragment key={`static-${path.id}`}>
                  <circle
                    cx={startX}
                    cy={startY}
                    r={5}
                    fill={path.color}
                    stroke="hsl(var(--card-foreground))"
                    strokeWidth={1.5}
                    opacity={0.8}
                  />
                  {path.points.length > 1 && (
                     <rect
                        x={endX - 4}
                        y={endY - 4}
                        width={8}
                        height={8}
                        fill={path.color}
                        stroke="hsl(var(--card-foreground))"
                        strokeWidth={1.5}
                        opacity={0.8}
                      />
                  )}
                </React.Fragment>
              );
            }
          })}
        </svg>
      )}
    </div>
  );
};

export default CoordinatePlaneView;
