
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import React, { useRef, useState, useEffect } from 'react';
import { Button } from './Button';

interface VoiceRecorderProps {
  onTranscriptUpdate: (text: string) => void;
  onFinished: () => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onTranscriptUpdate, onFinished }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interimText, setInterimText] = useState('');
  
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const transcriptHistoryRef = useRef<string[]>([]);
  const currentTurnTranscriptRef = useRef('');
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      stopSession();
    };
  }, []);

  const encode = (bytes: Uint8Array) => {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const createBlob = (data: Float32Array) => {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = data[i] * 32768;
    }
    return {
      data: encode(new Uint8Array(int16.buffer)),
      mimeType: 'audio/pcm;rate=16000',
    };
  };

  const startSession = async () => {
    setError(null);
    setIsConnecting(true);
    setInterimText('');
    transcriptHistoryRef.current = [];
    currentTurnTranscriptRef.current = '';

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      if (inputCtx.state === 'suspended') {
        await inputCtx.resume();
      }
      audioContextRef.current = inputCtx;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            console.log('Live session ready');
            setIsConnecting(false);
            setIsActive(true);
            
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              
              // Only send if session is resolved; this handles backend proxy latency perfectly
              sessionPromise.then((session) => {
                if (session && session.sendRealtimeInput) {
                  try {
                    session.sendRealtimeInput({ media: pcmBlob });
                  } catch (err) {
                    // Ignore transient errors
                  }
                }
              }).catch(() => {});
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              currentTurnTranscriptRef.current += text;
              setInterimText(currentTurnTranscriptRef.current);
              
              const fullText = [...transcriptHistoryRef.current, currentTurnTranscriptRef.current].join(' ');
              onTranscriptUpdate(fullText);
            }

            if (message.serverContent?.turnComplete) {
              if (currentTurnTranscriptRef.current.trim()) {
                transcriptHistoryRef.current.push(currentTurnTranscriptRef.current.trim());
              }
              currentTurnTranscriptRef.current = '';
              setInterimText('');
            }
          },
          onerror: (e) => console.warn('WebSocket API Error:', e),
          onclose: (e) => {
            setIsActive(false);
            setIsConnecting(false);
            if (e.code && e.code !== 1000 && e.code !== 1005) {
              setError(`Session closed unexpectedly (Code ${e.code}).`);
            }
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
          },
          systemInstruction: 'Transcribe spoken words accurately. Do not reply with audio.'
        },
      });

      sessionPromiseRef.current = sessionPromise;
    } catch (err: any) {
      setError('Could not access microphone.');
      setIsConnecting(false);
      setIsActive(false);
    }
  };

  const stopSession = () => {
    if (sessionPromiseRef.current) {
      sessionPromiseRef.current.then(session => {
        try { session.close(); } catch(e) {}
      }).catch(() => {});
      sessionPromiseRef.current = null;
    }
    
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch(e) {}
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setIsActive(false);
    setIsConnecting(false);
    onFinished();
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      {!isActive && !isConnecting ? (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-slate-700">Talk it out</h4>
            <p className="text-sm text-slate-500">
              Explain your idea like you're talking to a friend. We'll structure it into slides.
            </p>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <Button onClick={startSession} variant="ghost" className="whitespace-nowrap">
              Start recording
            </Button>
            {error && <p className="text-xs text-rose-500 text-center">{error}</p>}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
              <div className="flex gap-0.5 items-end h-4">
                <div className="w-1 bg-white rounded-full animate-[bounce_1s_infinite] h-2"></div>
                <div className="w-1 bg-white rounded-full animate-[bounce_1.2s_infinite] h-4"></div>
                <div className="w-1 bg-white rounded-full animate-[bounce_0.8s_infinite] h-3"></div>
                <div className="w-1 bg-white rounded-full animate-[bounce_1.4s_infinite] h-2.5"></div>
              </div>
            </div>
            <span className="text-sm font-semibold text-slate-700">
              {isConnecting ? 'Connecting...' : 'Listening...'}
            </span>
          </div>
          <div className="min-h-[60px] max-h-32 overflow-y-auto bg-slate-50 rounded-xl p-4 border border-slate-100 text-sm text-slate-600 leading-relaxed">
            {interimText || (isConnecting ? '' : 'Ready when you are...')}
          </div>
          <Button onClick={stopSession} variant="ghost" className="w-full">
            Done — use this text
          </Button>
        </div>
      )}
    </div>
  );
};
