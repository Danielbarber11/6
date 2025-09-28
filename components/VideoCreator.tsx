import React, { useState, useCallback, useRef, useEffect } from 'react';
import { geminiService } from '../services/geminiService';
import { FilmIcon, UploadIcon, CloseIcon } from './Icons';
import Spinner from './Spinner';

const loadingMessages = [
    "מכין את המצלמה...",
    "מכוונן את הפוקוס...",
    "מגדיר את התאורה...",
    "מתחיל לצלם את הסצנה...",
    "מעבד את הפריימים...",
    "מוסיף אפקטים מיוחדים...",
    "כמעט מוכן, עריכה אחרונה..."
];

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const VideoCreator: React.FC<ModalProps> = ({ isOpen, onClose }) => {
    const [prompt, setPrompt] = useState('');
    const [sourceImage, setSourceImage] = useState<{ file: File; dataUrl: string } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
    const [loadingMessage, setLoadingMessage] = useState(loadingMessages[0]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const intervalRef = useRef<number | null>(null);

    useEffect(() => {
        if (isLoading) {
            intervalRef.current = window.setInterval(() => {
                setLoadingMessage(prev => {
                    const currentIndex = loadingMessages.indexOf(prev);
                    const nextIndex = (currentIndex + 1) % loadingMessages.length;
                    return loadingMessages[nextIndex];
                });
            }, 4000);
        } else if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isLoading]);
    
    const fileToBase64 = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => {
              const base64String = (reader.result as string).split(',')[1];
              resolve(base64String);
          };
          reader.onerror = error => reject(error);
      });
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setSourceImage({ file, dataUrl: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleGenerate = useCallback(async () => {
        const currentPrompt = prompt.trim();
        if (!currentPrompt) return;

        setIsLoading(true);
        setError(null);
        setGeneratedVideo(null);
        setLoadingMessage(loadingMessages[0]);
        setPrompt(''); // Clear input after sending

        try {
            let imageParam: { imageBytes: string; mimeType: string } | undefined = undefined;
            if (sourceImage) {
                const imageBytes = await fileToBase64(sourceImage.file);
                imageParam = { imageBytes, mimeType: sourceImage.file.type };
            }

            let operation = await geminiService.generateVideo(currentPrompt, imageParam);

            while (!operation.done) {
                await new Promise(resolve => setTimeout(resolve, 10000));
                operation = await geminiService.getVideoOperationStatus(operation);
            }

            if (operation.response?.generatedVideos?.[0]?.video?.uri) {
                const downloadLink = operation.response.generatedVideos[0].video.uri;
                const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
                if (!videoResponse.ok) throw new Error('Failed to download video');
                const videoBlob = await videoResponse.blob();
                const videoUrl = URL.createObjectURL(videoBlob);
                setGeneratedVideo(videoUrl);
            } else {
                throw new Error('Video generation failed or returned no video.');
            }

        } catch (e) {
            console.error(e);
            setError('שגיאה ביצירת הוידאו. נסה שוב.');
        } finally {
            setIsLoading(false);
        }
    }, [prompt, sourceImage]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
             <div className="relative animated-border-container rounded-3xl shadow-xl max-w-2xl w-full">
                <div className="relative bg-white rounded-2xl max-h-[90vh] flex flex-col">
                    <div className="flex justify-between items-center p-4 border-b">
                        <h2 className="text-2xl font-semibold text-gray-800">יצירת וידאו</h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <CloseIcon className="w-6 h-6"/>
                        </button>
                    </div>
                    <div className="flex flex-col flex-grow overflow-y-auto p-6">
                        <div className="flex-grow flex flex-col items-center justify-center min-h-[40vh] bg-gray-50 rounded-2xl">
                            {isLoading ? (
                                <div className="text-center">
                                    <Spinner />
                                    <p className="mt-4 text-lg">{loadingMessage}</p>
                                    <p className="text-sm text-gray-500 mt-2">(יצירת וידאו עשויה לקחת מספר דקות)</p>
                                </div>
                            ) : generatedVideo ? (
                                <video src={generatedVideo} controls autoPlay loop className="max-w-full max-h-[50vh] rounded-lg shadow-lg" />
                            ) : (
                                <div className="text-center text-gray-400">
                                    <FilmIcon className="w-24 h-24 mx-auto" />
                                    <p className="mt-4 text-lg">הוידאו שייוצר יופיע כאן</p>
                                </div>
                            )}
                            {error && <p className="text-red-500 mt-4">{error}</p>}
                        </div>
                        <div className="mt-6 space-y-4">
                            <div className="animated-border-container rounded-full">
                                <div className="flex items-center gap-2 bg-white rounded-full">
                                    <input
                                        type="text"
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        placeholder="תאר את הוידאו שברצונך ליצור..."
                                        className="flex-grow p-3 bg-transparent rounded-full focus:outline-none border-none"
                                        disabled={isLoading}
                                        onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                                    />
                                    <button
                                        onClick={handleGenerate}
                                        disabled={isLoading || !prompt.trim()}
                                        className="px-6 py-3 bg-blue-600 rounded-full text-white font-semibold disabled:bg-gray-400 hover:bg-blue-700 transition-colors m-1"
                                    >
                                        צור
                                    </button>
                                </div>
                            </div>
                            <div 
                                className="w-full flex items-center justify-center gap-3 p-3 bg-gray-50 rounded-full cursor-pointer hover:bg-gray-100 transition-colors border border-gray-200"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <UploadIcon className="w-6 h-6 text-gray-500"/>
                                <span className="text-gray-600">{sourceImage ? `תמונה נבחרה: ${sourceImage.file.name}` : 'העלה תמונה (אופציונלי)'}</span>
                                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                            </div>
                        </div>
                    </div>
                </div>
             </div>
        </div>
    );
};

export default VideoCreator;