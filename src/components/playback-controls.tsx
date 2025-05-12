"use client";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Play, Pause, Settings, RotateCcw } from "lucide-react";
import type { PlaybackState } from "@/lib/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, isValid } from 'date-fns';

interface PlaybackControlsProps {
  playbackState: PlaybackState;
  onPlayPause: () => void;
  onSpeedChange: (speed: number) => void;
  onTimeScrub: (time: number) => void;
}

const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  playbackState,
  onPlayPause,
  onSpeedChange,
  onTimeScrub,
}) => {
  const { isPlaying, speed, currentTime, startTime, endTime } = playbackState;

  const formatTimestamp = (ts: number) => {
    if (ts === Infinity || ts === -Infinity || isNaN(ts)) return "N/A";
    const date = new Date(ts * 1000);
    if (!isValid(date)) return "Invalid Date";
    try {
      return format(date, "MMM d, HH:mm:ss");
    } catch {
      return "Error Formatting Date";
    }
  };
  
  const duration = endTime - startTime;
  const progressPercent = duration > 0 ? ((currentTime - startTime) / duration) * 100 : 0;

  const handleReset = () => {
    onTimeScrub(startTime); 
  };

  return (
    <div className="space-y-4 p-1">
      <div className="flex items-center justify-center space-x-2">
        <Button variant="outline" size="icon" onClick={handleReset} aria-label="Reset Playback to Start" className="shadow-sm">
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button 
          variant="default" 
          size="icon" 
          onClick={onPlayPause} 
          aria-label={isPlaying ? "Pause Playback" : "Play Playback"}
          className="w-12 h-12 rounded-full shadow-md hover:bg-primary/90"
        >
          {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 fill-current" />}
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Playback Settings" className="shadow-sm">
              <Settings className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-60 p-4 shadow-xl rounded-lg">
            <div className="space-y-3">
              <Label htmlFor="speed-slider" className="text-sm font-medium text-foreground">Playback Speed: {speed}x</Label>
              <Slider
                id="speed-slider"
                min={0.25}
                max={8}
                step={0.25}
                value={[speed]}
                onValueChange={(value) => onSpeedChange(value[0])}
                aria-label="Playback speed control"
                className="[&>span]:bg-primary"
              />
            </div>
          </PopoverContent>
        </Popover>
      </div>
      
      <div className="space-y-2 pt-2">
        <div className="flex justify-between items-baseline mb-1">
            <Label htmlFor="time-scrubber" className="text-xs text-muted-foreground">
            Timeline
            </Label>
            <span className="text-xs font-mono text-accent tabular-nums bg-muted px-1.5 py-0.5 rounded">
                {formatTimestamp(currentTime)}
            </span>
        </div>
        <Slider
          id="time-scrubber"
          min={startTime}
          max={endTime > startTime ? endTime : startTime + 1} // Ensure max is always > min
          step={1} 
          value={[currentTime]}
          onValueChange={(value) => onTimeScrub(value[0])}
          aria-label="Timeline scrubber"
          disabled={startTime === endTime}
          className="[&>span]:bg-primary"
        />
        <div className="flex justify-between text-xs text-muted-foreground pt-1">
          <span>{formatTimestamp(startTime)}</span>
          <span>{formatTimestamp(endTime)}</span>
        </div>
      </div>
    </div>
  );
};

export default PlaybackControls;
