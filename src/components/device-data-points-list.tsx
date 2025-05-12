
"use client";

import type { DevicePath, LocationPoint } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, isValid } from 'date-fns';
import React, { useMemo, useRef, useEffect } from 'react';

interface EnrichedPoint extends LocationPoint {
  deviceId: string;
  color: string;
}

interface DeviceDataPointsListProps {
  paths: DevicePath[];
  playbackCurrentTime: number;
}

const formatFullTimestamp = (ts: number) => {
  if (ts === Infinity || ts === -Infinity || isNaN(ts)) return "N/A";
  const date = new Date(ts * 1000);
  if (!isValid(date)) return "Invalid Date";
  try {
    return format(date, "MMM d, HH:mm:ss");
  } catch {
    return "Error Formatting Date";
  }
};

const DeviceDataPointsList: React.FC<DeviceDataPointsListProps> = ({ paths, playbackCurrentTime }) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const activeRowRef = useRef<HTMLTableRowElement>(null);

  const allSortedPoints = useMemo(() => {
    const flatPoints: EnrichedPoint[] = [];
    paths.forEach(path => {
      if (path.points && path.points.length > 0) {
        path.points.forEach(point => {
          flatPoints.push({
            ...point,
            deviceId: path.id,
            color: path.color,
          });
        });
      }
    });
    return flatPoints.sort((a, b) => a.timestamp - b.timestamp);
  }, [paths]);

  const currentIndex = useMemo(() => {
    if (!playbackCurrentTime || allSortedPoints.length === 0) return -1;
    let idx = -1;
    for (let i = 0; i < allSortedPoints.length; i++) {
      if (allSortedPoints[i].timestamp <= playbackCurrentTime) {
        idx = i;
      } else {
        break; 
      }
    }
    return idx;
  }, [allSortedPoints, playbackCurrentTime]);

  useEffect(() => {
    if (activeRowRef.current && scrollAreaRef.current) {
      const scrollableViewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (scrollableViewport) {
        const offsetTop = activeRowRef.current.offsetTop;
        const clientHeight = activeRowRef.current.clientHeight;
        scrollableViewport.scrollTop = Math.max(0, offsetTop - (scrollableViewport.clientHeight / 2) + (clientHeight / 2));
      }
    }
  }, [currentIndex]);


  if (allSortedPoints.length === 0) {
    return (
      <Card className="shadow-md mt-4">
        <CardHeader>
          <CardTitle className="text-lg">Device Data Log</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center p-4">No data points to display for selected devices.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md mt-4">
      <CardHeader>
        <CardTitle className="text-lg">Device Data Log</CardTitle>
        <p className="text-sm text-muted-foreground">Current Playback Time: {formatFullTimestamp(playbackCurrentTime)}</p>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-72" ref={scrollAreaRef}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px] py-2 px-3">Device ID</TableHead>
                <TableHead className="py-2 px-3">Timestamp</TableHead>
                <TableHead className="py-2 px-3">Latitude</TableHead>
                <TableHead className="py-2 px-3">Longitude</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allSortedPoints.map((point, index) => (
                <TableRow
                  key={`${point.deviceId}-${point.timestamp}-${index}`}
                  ref={index === currentIndex ? activeRowRef : null}
                  className={index === currentIndex ? 'bg-accent/30' : ''}
                >
                  <TableCell className="font-medium truncate py-2 px-3" title={point.deviceId}>
                    <span style={{ color: point.color, marginRight: '0.25rem', fontSize: '1.2em', verticalAlign: 'middle' }}>●</span>
                    {point.deviceId.substring(0,12) + (point.deviceId.length > 12 ? '...' : '')}
                  </TableCell>
                  <TableCell className="py-2 px-3">{formatFullTimestamp(point.timestamp)}</TableCell>
                  <TableCell className="py-2 px-3">{point.latitude.toFixed(6)}</TableCell>
                  <TableCell className="py-2 px-3">{point.longitude.toFixed(6)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default DeviceDataPointsList;
