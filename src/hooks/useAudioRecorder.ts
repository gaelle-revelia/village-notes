import { useState, useRef, useCallback, useEffect } from "react";

interface UseAudioRecorderReturn {
  isRecording: boolean;
  isPaused: boolean;
  elapsedSeconds: number;
  audioBlob: Blob | null;
  permissionDenied: boolean;
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
  clearLastBlob: () => void;
}

const MAX_DURATION = 600; // 10 minutes
const WARNING_DURATION = 540; // 9 minutes

export function useAudioRecorder(onWarning?: () => void): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const warningFiredRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setPermissionDenied(false);

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      warningFiredRef.current = false;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        console.info("[vocal-recording] recording stopped, blob ready", {
          hook: "useAudioRecorder",
          mimeType,
          blobSizeBytes: blob.size,
          timestamp: new Date().toISOString(),
        });
        stream.getTracks().forEach((t) => t.stop());
        clearTimer();
      };

      recorder.start(1000); // collect chunks every second
      setIsRecording(true);
      setAudioBlob(null);
      setElapsedSeconds(0);

      timerRef.current = window.setInterval(() => {
        setElapsedSeconds((prev) => {
          const next = prev + 1;
          if (next >= WARNING_DURATION && !warningFiredRef.current) {
            warningFiredRef.current = true;
            onWarning?.();
          }
          if (next >= MAX_DURATION) {
            recorder.stop();
            setIsRecording(false);
          }
          return next;
        });
      }, 1000);
    } catch (err) {
      console.error("Microphone access denied:", err);
      setPermissionDenied(true);
    }
  }, [clearTimer, onWarning]);

  const stop = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  const reset = useCallback(() => {
    setAudioBlob(null);
    setElapsedSeconds(0);
    setIsRecording(false);
    setIsPaused(false);
    chunksRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      clearTimer();
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, [clearTimer]);

  const clearLastBlob = useCallback(() => {
    setAudioBlob(null);
  }, []);

  return {
    isRecording,
    isPaused,
    elapsedSeconds,
    audioBlob,
    permissionDenied,
    start,
    stop,
    reset,
    clearLastBlob,
  };
}
