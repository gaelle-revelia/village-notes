import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseVocalRecordingReturn {
  isRecording: boolean;
  isTranscribing: boolean;
  error: string | null;
  elapsedSeconds: number;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
}

export function useVocalRecording(mode: string = "transcription_only"): UseVocalRecordingReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedSecondsRef = useRef(0);

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

        if (blob.size === 0 || finalElapsed < 10) {
          if (finalElapsed < 10) {
            setError("Enregistrement trop court — parle au moins 10 secondes.");
          } else {
            setError("Transcription échouée — réessaie ou utilise la saisie texte.");
          }
          resolve(null);
          return;
        }

        setIsTranscribing(true);

        try {
          const uuid = crypto.randomUUID();
          const audioPath = `synthesis/${uuid}.webm`;

          const { error: uploadError } = await supabase.storage
            .from("audio-temp")
            .upload(audioPath, blob, { contentType: mimeType, upsert: false });

          if (uploadError) throw uploadError;

          const { data, error: fnError } = await supabase.functions.invoke("process-memo", {
            body: { mode: "transcription_only", audio_path: audioPath },
          });

          if (fnError) throw fnError;

          const transcription = data?.transcription || "";
          setIsTranscribing(false);
          resolve(transcription);
        } catch (err) {
          console.error("Vocal recording error:", err);
          setError("Transcription échouée — réessaie ou utilise la saisie texte.");
          setIsTranscribing(false);
          resolve(null);
        }
      };

      recorder.stop();
    });
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return { isRecording, isTranscribing, error, elapsedSeconds, startRecording, stopRecording };
}
