import React, { useState, useRef, useCallback, useEffect } from 'react';
import { geminiService } from '../services/geminiService';
import { MicrophoneIcon, StopCircleIcon, CloseIcon, VideoOnIcon, VideoOffIcon, UserCircleIcon, SparklesIcon } from './Icons';
import type { LiveServerMessage } from '@google/genai';
import { encode, decode, decodeAudioData, createBlob, blobToBase64 } from '../utils/audioUtils';

interface LiveProps {
  isOpen: boolean;
  onClose: () => void;
}

const FRAME_RATE = 2; // frames per second
const JPEG_QUALITY = 0.7;

const Live: React.FC<LiveProps> = ({ isOpen, onClose }) => {
  const [isLive, setIsLive] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [transcriptions, setTranscriptions] = useState<{ type: 'user' | 'model'; text: string }[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [currentOutput, setCurrentOutput] = useState('');
  
  const sessionPromiseRef = useRef<ReturnType<typeof geminiService.connectLive> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const videoElRef = useRef<HTMLVideoElement>(null);
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const frameIntervalRef = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcriptions, currentInput, currentOutput]);

  const stopLiveSession = useCallback(async (shouldCallOnClose = true) => {
    setIsLive(false);
    setIsVideoOn(false);

    if (sessionPromiseRef.current) {
      const session = await sessionPromiseRef.current;
      session.close();
      sessionPromiseRef.current = null;
    }
    if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
        audioStreamRef.current = null;
    }
    if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach(track => track.stop());
        videoStreamRef.current = null;
    }
    if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
        frameIntervalRef.current = null;
    }
    if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current = null;
    }
    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
        inputAudioContextRef.current.close();
    }
    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
        outputAudioContextRef.current.close();
    }
    audioSourcesRef.current.forEach(source => source.stop());
    audioSourcesRef.current.clear();
    setCurrentInput('');
    setCurrentOutput('');
    if (shouldCallOnClose) {
        onClose();
    }
  }, [onClose]);

  const startLiveSession = useCallback(async () => {
    if (isLive) return;

    try {
      audioStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsLive(true);
      setTranscriptions([]);

      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      nextStartTimeRef.current = 0;

      sessionPromiseRef.current = geminiService.connectLive({
        onopen: () => {
          const source = inputAudioContextRef.current!.createMediaStreamSource(audioStreamRef.current!);
          const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
          scriptProcessorRef.current = scriptProcessor;

          scriptProcessor.onaudioprocess = (event: AudioProcessingEvent) => {
            const inputData = event.inputBuffer.getChannelData(0);
            const pcmBlob = createBlob(inputData);
            if (sessionPromiseRef.current) {
                sessionPromiseRef.current.then(session => {
                    session.sendRealtimeInput({ media: pcmBlob });
                });
            }
          };
          source.connect(scriptProcessor);
          scriptProcessor.connect(inputAudioContextRef.current!.destination);
        },
        onmessage: async (message: LiveServerMessage) => {
          let fullInput = currentInput;
          let fullOutput = currentOutput;
          if (message.serverContent?.inputTranscription) {
            fullInput += message.serverContent.inputTranscription.text;
            setCurrentInput(fullInput);
          }
          if (message.serverContent?.outputTranscription) {
            fullOutput += message.serverContent.outputTranscription.text;
            setCurrentOutput(fullOutput);
          }
          if (message.serverContent?.turnComplete) {
            setTranscriptions(prev => [...prev, {type: 'user', text: fullInput}, {type: 'model', text: fullOutput}]);
            setCurrentInput('');
            setCurrentOutput('');
          }

          const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          if (audioData) {
            const outputCtx = outputAudioContextRef.current!;
            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
            const audioBuffer = await decodeAudioData(decode(audioData), outputCtx, 24000, 1);
            const source = outputCtx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(outputCtx.destination);
            source.addEventListener('ended', () => audioSourcesRef.current.delete(source));
            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += audioBuffer.duration;
            audioSourcesRef.current.add(source);
          }
        },
        onerror: (err: ErrorEvent) => {
            console.error('Live session error:', err);
            stopLiveSession();
        },
        onclose: () => {
            stopLiveSession(false);
        },
      });
    } catch (err) {
      console.error('Failed to start live session:', err);
      alert('לא ניתן לגשת למיקרופון. אנא בדוק הרשאות.');
      stopLiveSession();
    }
  }, [isLive, stopLiveSession, currentInput, currentOutput]);

  const toggleVideo = useCallback(async () => {
    if (isVideoOn) {
      // Turn off video
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach(track => track.stop());
        videoStreamRef.current = null;
      }
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
        frameIntervalRef.current = null;
      }
      if (videoElRef.current) {
        videoElRef.current.srcObject = null;
      }
      setIsVideoOn(false);
    } else {
      // Turn on video
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoStreamRef.current = stream;
        if (videoElRef.current) {
          videoElRef.current.srcObject = stream;
        }
        setIsVideoOn(true);
        
        frameIntervalRef.current = window.setInterval(() => {
            const videoEl = videoElRef.current;
            const canvasEl = canvasElRef.current;
            if (!videoEl || !canvasEl || !sessionPromiseRef.current) return;

            const ctx = canvasEl.getContext('2d');
            if (!ctx) return;
            
            canvasEl.width = videoEl.videoWidth;
            canvasEl.height = videoEl.videoHeight;
            ctx.drawImage(videoEl, 0, 0, videoEl.videoWidth, videoEl.videoHeight);
            canvasEl.toBlob(async (blob) => {
                if (blob) {
                    const base64Data = await blobToBase64(blob);
                    sessionPromiseRef.current?.then((session) => {
                        session.sendRealtimeInput({ media: { data: base64Data, mimeType: 'image/jpeg' } });
                    });
                }
            }, 'image/jpeg', JPEG_QUALITY);
        }, 1000 / FRAME_RATE);
      } catch (err) {
        console.error('Failed to get video stream:', err);
        alert('לא ניתן לגשת למצלמה. אנא בדוק הרשאות.');
      }
    }
  }, [isVideoOn]);
  
  useEffect(() => {
    if (isOpen) {
        startLiveSession();
    } else {
        stopLiveSession(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm z-50 flex flex-col p-4">
      <div className="flex-grow w-full max-w-4xl mx-auto overflow-y-auto p-4 space-y-4 text-lg">
          {transcriptions.map((t, i) => (
              <div key={i} className={`flex gap-3 items-start ${t.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {t.type === 'model' && <div className="w-8 h-8 flex-shrink-0 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center shadow-md"><SparklesIcon className="w-5 h-5 text-white" /></div>}
                  <div className={`max-w-xl p-3 rounded-2xl shadow-sm text-white ${t.type === 'user' ? 'bg-purple-500/80 rounded-br-none' : 'bg-gray-700/80 rounded-bl-none'}`}>
                      {t.text}
                  </div>
                  {t.type === 'user' && <div className="w-8 h-8 flex-shrink-0 rounded-full bg-gray-600 flex items-center justify-center"><UserCircleIcon className="w-6 h-6 text-gray-300" /></div>}
              </div>
          ))}
          {currentInput && (
              <div className="flex gap-3 items-start justify-end">
                  <div className="max-w-xl p-3 rounded-2xl shadow-sm text-white bg-purple-500/30 rounded-br-none italic">
                      {currentInput}
                  </div>
                  <div className="w-8 h-8 flex-shrink-0 rounded-full bg-gray-600 flex items-center justify-center"><UserCircleIcon className="w-6 h-6 text-gray-300" /></div>
              </div>
          )}
          {currentOutput && (
               <div className="flex gap-3 items-start justify-start">
                  <div className="w-8 h-8 flex-shrink-0 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center shadow-md"><SparklesIcon className="w-5 h-5 text-white" /></div>
                  <div className="max-w-xl p-3 rounded-2xl shadow-sm text-white bg-gray-700/30 rounded-bl-none italic">
                      {currentOutput}
                  </div>
              </div>
          )}
          <div ref={scrollRef} />
      </div>
      <div className="flex-shrink-0 mt-auto flex flex-col items-center">
            {isVideoOn && (
                <div className="relative w-28 h-28 mb-[-3.5rem] z-20 transition-all duration-500 ease-in-out">
                    <video
                        ref={videoElRef}
                        autoPlay
                        muted
                        className="w-full h-full rounded-full object-cover border-4 border-purple-400 shadow-2xl"
                    />
                    <div className="absolute inset-0 rounded-full ring-4 ring-purple-500/50 animate-pulse"></div>
                </div>
            )}
            <div className="relative w-full max-w-sm h-32 flex items-center justify-center mb-6 wave-background rounded-3xl p-4">
                <div className="absolute inset-0 bg-black/30 rounded-3xl"></div>
                <div className="relative z-10 flex items-center justify-around w-full">
                    <button onClick={onClose} className="p-4 bg-black/30 rounded-full text-white hover:bg-red-500 transition-colors">
                        <CloseIcon className="w-8 h-8"/>
                    </button>

                    <div className="relative w-20 h-20 flex items-center justify-center">
                        <div className="absolute inset-0 bg-purple-500 rounded-full animate-ping"></div>
                        <div className="relative bg-purple-600 rounded-full p-4 text-white">
                            <MicrophoneIcon className="w-12 h-12"/>
                        </div>
                    </div>

                     <button onClick={toggleVideo} className={`p-4 rounded-full text-white transition-colors ${isVideoOn ? 'bg-green-500' : 'bg-black/30 hover:bg-green-500/50'}`}>
                        {isVideoOn ? <VideoOnIcon className="w-8 h-8"/> : <VideoOffIcon className="w-8 h-8"/>}
                    </button>
                </div>
            </div>
          <button onClick={() => stopLiveSession()} className="bg-red-600 text-white rounded-full p-4 hover:bg-red-700 transition-colors flex items-center gap-2">
              <StopCircleIcon className="w-6 h-6"/>
              <span>סיים שיחה</span>
          </button>
           <canvas ref={canvasElRef} className="hidden"></canvas>
      </div>
    </div>
  );
};

export default Live;