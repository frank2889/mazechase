// TypeScript content with proper types

import { useEffect, useRef } from 'react';

interface ReplaySharingOptions {
  onClipReady: (clip: Blob) => void;
  duration: number; // Duration of the clip in seconds
}

export function useReplaySharing({ onClipReady, duration }: ReplaySharingOptions) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    async function setupRecording() {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true
        });
        mediaRecorderRef.current = new MediaRecorder(stream, {
          mimeType: 'video/webm; codecs=vp9'
        });

        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };

        mediaRecorderRef.current.onstop = () => {
          const blob = new Blob(recordedChunksRef.current, {
            type: 'video/webm'
          });
          onClipReady(blob);
          recordedChunksRef.current = [];
        };
      } catch (error) {
        console.error('Error setting up media recorder:', error);
      }
    }

    setupRecording();

    return () => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [onClipReady, duration]);

  const startRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'inactive') {
      recordedChunksRef.current = [];
      mediaRecorderRef.current.start();
      setTimeout(() => {
        mediaRecorderRef.current?.stop();
      }, duration * 1000);
    }
  };

  return { startRecording };
}
