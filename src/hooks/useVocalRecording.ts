import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isNetworkError, retryOnNetworkError } from "@/lib/network";

interface PendingBlob {
  blob: Blob;
  mimeType: string;
  durationMs: number;
}

interface UseVocalRecordingReturn {
  isRecording: boolean;
  isTranscribing: boolean;
  error: string | null;
  elapsedSeconds: number;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  retry: () => Promise<string | null>;
  cancelPendingRetry: () => void;
  canRetry: boolean;
  retryAttempt: number;
}

export function useVocalRecording(mode: string = "transcription_only", childId?: string, minDuration: number = 10): UseVocalRecordingReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [pendingRetry, setPendingRetry] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedSecondsRef = useRef(0);
  const lastBlobRef = useRef<PendingBlob | null>(null);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.start(1000);
      setElapsedSeconds(0);
      elapsedSecondsRef.current = 0;
      timerRef.current = setInterval(() => {
        setElapsedSeconds((s) => { elapsedSecondsRef.current = s + 1; return s + 1; });
      }, 1000);
      setIsRecording(true);
    } catch {
      setError("Microphone non disponible — utilise la saisie texte.");
    }
  }, []);

  /**
   * Internal: upload + invoke wrapped with network retry.
   * Generates a fresh UUID per attempt (upsert: false strategy).
   */
  const executeUploadAndInvoke = useCallback(
    async (pending: PendingBlob): Promise<string> => {
      return retryOnNetworkError(
        async (attempt) => {
          const uuid = crypto.randomUUID();
          const audioPath = `synthesis/${uuid}.webm`;

          const { error: uploadError } = await supabase.storage
            .from("audio-temp")
            .upload(audioPath, pending.blob, { contentType: pending.mimeType, upsert: false });

          if (uploadError) throw uploadError;

          if (attempt === 0) {
            console.info("[vocal-recording] invoke process-memo", {
              hook: "useVocalRecording",
              mode,
              mimeType: pending.mimeType,
              blobSizeBytes: pending.blob.size,
              durationMs: pending.durationMs,
              audioPath,
              timestamp: new Date().toISOString(),
            });
          }

          const { data, error: fnError } = await supabase.functions.invoke("process-memo", {
            body: { mode, audio_path: audioPath, ...(childId ? { child_id: childId } : {}) },
          });

          if (fnError) throw fnError;

          const result = data?.answer || data?.transcription || "";
          return result;
        },
        {
          delays: [500, 2000],
          onRetry: (attempt, reason) => {
            setRetryAttempt(attempt);
            console.info("[vocal-recording] retry attempt", {
              hook: "useVocalRecording",
              mode,
              attempt,
              reason,
              timestamp: new Date().toISOString(),
            });
          },
        }
      );
    },
    [mode, childId]
  );

  const stopRecording = useCallback(async (): Promise<string | null> => {
    setError(null);

    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state !== "recording") {
        setIsRecording(false);
        resolve(null);
        return;
      }

      recorder.onstop = async () => {
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        const finalElapsed = elapsedSecondsRef.current;
        setIsRecording(false);
        setElapsedSeconds(0);
        streamRef.current?.getTracks().forEach((t) => t.stop());

        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];

        if (blob.size === 0 || finalElapsed < minDuration) {
          if (finalElapsed < minDuration) {
            setError(`Enregistrement trop court — parlez au moins ${minDuration} secondes.`);
          } else {
            setError("Transcription échouée — réessaie ou utilise la saisie texte.");
          }
          resolve(null);
          return;
        }

        setIsTranscribing(true);
        setRetryAttempt(0);

        const pending: PendingBlob = { blob, mimeType, durationMs: finalElapsed * 1000 };

        try {
          const result = await executeUploadAndInvoke(pending);
          console.info("[vocal-recording] process-memo success", {
            hook: "useVocalRecording",
            mode,
            durationMs: pending.durationMs,
            timestamp: new Date().toISOString(),
          });
          lastBlobRef.current = null;
          setPendingRetry(false);
          setRetryAttempt(0);
          setIsTranscribing(false);
          resolve(result);
        } catch (err) {
          const err2 = err as { message?: string; status?: number; context?: { body?: unknown }; body?: unknown };
          console.error("[vocal-recording] process-memo failed", {
            hook: "useVocalRecording",
            mode,
            mimeType: pending.mimeType,
            blobSizeBytes: pending.blob.size,
            errorMessage: err2?.message ?? String(err),
            errorStatus: err2?.status ?? null,
            errorBody: err2?.context?.body ?? err2?.body ?? null,
            timestamp: new Date().toISOString(),
          });
          console.error("Vocal recording error:", err);

          if (isNetworkError(err)) {
            lastBlobRef.current = pending;
            setPendingRetry(true);
            setError("Connexion instable");
          } else {
            lastBlobRef.current = null;
            setPendingRetry(false);
            setError("Transcription échouée — réessaie ou utilise la saisie texte.");
          }
          setRetryAttempt(0);
          setIsTranscribing(false);
          resolve(null);
        }
      };

      recorder.stop();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [executeUploadAndInvoke, minDuration, mode]);

  const retry = useCallback(async (): Promise<string | null> => {
    if (!lastBlobRef.current || isTranscribing) return null;
    const pending = lastBlobRef.current;

    console.info("[vocal-recording] manual retry requested", {
      hook: "useVocalRecording",
      mode,
      timestamp: new Date().toISOString(),
    });

    setIsTranscribing(true);
    setError(null);
    setRetryAttempt(0);

    try {
      const result = await executeUploadAndInvoke(pending);
      console.info("[vocal-recording] process-memo success", {
        hook: "useVocalRecording",
        mode,
        durationMs: pending.durationMs,
        timestamp: new Date().toISOString(),
      });
      lastBlobRef.current = null;
      setPendingRetry(false);
      setRetryAttempt(0);
      return result;
    } catch (err) {
      const err2 = err as { message?: string; status?: number; context?: { body?: unknown }; body?: unknown };
      console.error("[vocal-recording] process-memo failed", {
        hook: "useVocalRecording",
        mode,
        mimeType: pending.mimeType,
        blobSizeBytes: pending.blob.size,
        errorMessage: err2?.message ?? String(err),
        errorStatus: err2?.status ?? null,
        errorBody: err2?.context?.body ?? err2?.body ?? null,
        timestamp: new Date().toISOString(),
      });
      console.error("Vocal recording error:", err);

      if (isNetworkError(err)) {
        lastBlobRef.current = pending;
        setPendingRetry(true);
        setError("Connexion instable");
      } else {
        lastBlobRef.current = null;
        setPendingRetry(false);
        setError("Transcription échouée — réessaie ou utilise la saisie texte.");
      }
      setRetryAttempt(0);
      return null;
    } finally {
      setIsTranscribing(false);
    }
  }, [executeUploadAndInvoke, isTranscribing, mode]);

  const cancelPendingRetry = useCallback(() => {
    console.info("[vocal-recording] manual retry cancelled", {
      hook: "useVocalRecording",
      mode,
      timestamp: new Date().toISOString(),
    });
    lastBlobRef.current = null;
    setPendingRetry(false);
    setError(null);
    setRetryAttempt(0);
  }, [mode]);

  useEffect(() => {
    return () => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return {
    isRecording,
    isTranscribing,
    error,
    elapsedSeconds,
    startRecording,
    stopRecording,
    retry,
    cancelPendingRetry,
    canRetry: pendingRetry && !!lastBlobRef.current,
    retryAttempt,
  };
}
