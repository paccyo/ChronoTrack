import ChronoTrackApp from '@/components/chrono-track-app';
import { Toaster } from '@/components/ui/toaster';

export default function Home() {
  return (
    <main className="h-screen flex flex-col">
      <ChronoTrackApp />
      <Toaster />
    </main>
  );
}
