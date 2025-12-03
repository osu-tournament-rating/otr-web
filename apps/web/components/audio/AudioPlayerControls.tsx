'use client';

import { Pause, Volume2, VolumeX, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useAudioPlayer } from '@/lib/hooks/useAudioPlayer';

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function AudioPlayerControls() {
  const { state, pause, setVolume, seek } = useAudioPlayer();

  if (state.currentlyPlaying === null) {
    return null;
  }

  const isMuted = state.volume === 0;

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0] / 100);
  };

  const handleSeek = (value: number[]) => {
    seek(value[0]);
  };

  const toggleMute = () => {
    setVolume(isMuted ? 0.25 : 0);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-2 sm:inset-x-auto sm:bottom-4 sm:right-4">
      <div className="bg-popover border-border flex flex-col gap-2 rounded-lg border p-3 shadow-lg">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground w-10 text-xs">
            {formatTime(state.currentTime)}
          </span>
          <Slider
            className="min-w-0 flex-1 sm:w-32 sm:flex-none"
            value={[state.currentTime]}
            onValueChange={handleSeek}
            max={state.duration || 100}
            step={0.1}
          />
          <span className="text-muted-foreground w-10 text-xs">
            {formatTime(state.duration)}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={pause}
            aria-label="Pause"
          >
            <Pause className="h-4 w-4" />
          </Button>

          <div className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0"
              onClick={toggleMute}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
            <Slider
              className="min-w-0 flex-1 sm:w-24 sm:flex-none"
              value={[state.volume * 100]}
              onValueChange={handleVolumeChange}
              max={100}
              step={1}
            />
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={pause}
            aria-label="Stop"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
