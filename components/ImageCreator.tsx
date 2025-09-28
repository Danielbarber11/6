import React, { useState, useCallback } from 'react';
import { geminiService } from '../services/geminiService';
import { ImageIcon, CloseIcon, DownloadIcon } from './Icons';
import Spinner from './Spinner';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ImageCreator: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    const currentPrompt = prompt.trim();
    if (!currentPrompt) return;

    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);
    setPrompt(''); // Clear input after sending

    try {
      const base64ImageBytes = await geminiService.generateImage(currentPrompt);
      const imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;
      setGeneratedImage(imageUrl);
    } catch (e) {
      console.error(e);
      setError('שגיאה ביצירת התמונה. נסה שוב.');
    } finally {
      setIsLoading(false);
    }
  }, [prompt]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="relative animated-border-container rounded-3xl shadow-xl max-w-2xl w-full">
        <div className="bg-white rounded-2xl max-h-[90vh] flex flex-col">
          <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-2xl font-semibold text-gray-800">יצירת תמונה</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                  <CloseIcon className="w-6 h-6"/>
              </button>
          </div>
          <div className="flex flex-col flex-grow overflow-y-auto p-6">
              <div className="flex-grow flex flex-col items-center justify-center min-h-[40vh] relative bg-gray-50 rounded-2xl">
                  {isLoading ? (
                  <div className="text-center">
                      <Spinner />
                      <p className="mt-4 text-lg">יוצר את התמונה שלך...</p>
                  </div>
                  ) : generatedImage ? (
                  <div className="relative group">
                    <img src={generatedImage} alt="Generated" className="max-w-full max-h-[50vh] rounded-lg shadow-lg" />
                    <a href={generatedImage} download={`aiven-image-${Date.now()}.jpg`} className="absolute top-2 right-2 p-2 bg-white/70 backdrop-blur-sm rounded-full text-gray-800 opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110">
                        <DownloadIcon className="w-5 h-5" />
                    </a>
                  </div>
                  ) : (
                  <div className="text-center text-gray-400">
                      <ImageIcon className="w-24 h-24 mx-auto" />
                      <p className="mt-4 text-lg">התמונה שתיווצר תופיע כאן</p>
                  </div>
                  )}
                  {error && <p className="text-red-500 mt-4">{error}</p>}
              </div>
              <div className="mt-6 animated-border-container rounded-full">
                  <div className="flex items-center gap-2 bg-white rounded-full">
                      <input
                      type="text"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="תאר את התמונה שברצונך ליצור..."
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageCreator;