import React, { useState, useCallback, useRef } from 'react';
import { geminiService } from '../services/geminiService';
import { ScissorsIcon, UploadIcon, CloseIcon } from './Icons';
import Spinner from './Spinner';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ImageEditor: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  const [prompt, setPrompt] = useState('');
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setOriginalFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setOriginalImage(reader.result as string);
        setEditedImage(null);
      };
      reader.readAsDataURL(file);
    }
  };
  
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

  const handleGenerate = useCallback(async () => {
    const currentPrompt = prompt.trim();
    if (!currentPrompt || !originalFile) return;

    setIsLoading(true);
    setError(null);
    setEditedImage(null);
    setPrompt(''); // Clear input after sending

    try {
        const imageBase64 = await fileToBase64(originalFile);
        const editedBase64 = await geminiService.editImage(currentPrompt, imageBase64, originalFile.type);
        const imageUrl = `data:${originalFile.type};base64,${editedBase64}`;
        setEditedImage(imageUrl);
    } catch (e) {
      console.error(e);
      setError('שגיאה בעריכת התמונה. נסה שוב.');
    } finally {
      setIsLoading(false);
    }
  }, [prompt, originalFile]);
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="relative animated-border-container rounded-3xl shadow-xl max-w-4xl w-full">
            <div className="relative bg-white rounded-2xl max-h-[90vh] flex flex-col">
                 <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-2xl font-semibold text-gray-800">עריכת תמונה</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <CloseIcon className="w-6 h-6"/>
                    </button>
                </div>
                <div className="flex flex-col flex-grow overflow-y-auto p-6">
                    <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4 items-center justify-items-center min-h-[50vh]">
                        <div 
                        className="w-full h-64 md:h-full flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer hover:bg-gray-100/50 transition-colors bg-gray-50"
                        onClick={() => fileInputRef.current?.click()}
                        >
                        {originalImage ? (
                            <img src={originalImage} alt="Original" className="max-w-full max-h-full object-contain rounded-lg p-2" />
                        ) : (
                            <div className="text-center text-gray-500">
                            <UploadIcon className="w-16 h-16 mx-auto" />
                            <p className="mt-2">לחץ להעלאת תמונה</p>
                            </div>
                        )}
                        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                        </div>
                        <div className="w-full h-64 md:h-full flex items-center justify-center border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50">
                        {isLoading ? <Spinner /> : editedImage ? (
                            <img src={editedImage} alt="Edited" className="max-w-full max-h-full object-contain rounded-lg p-2" />
                        ) : (
                            <div className="text-center text-gray-500">
                            <ScissorsIcon className="w-16 h-16 mx-auto" />
                            <p className="mt-2">התמונה הערוכה תופיע כאן</p>
                            </div>
                        )}
                        </div>
                    </div>
                    {error && <p className="text-red-500 mt-4 text-center">{error}</p>}
                     <div className="mt-6 animated-border-container rounded-full">
                        <div className="flex items-center gap-2 bg-white rounded-full">
                            <input
                                type="text"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="תאר את השינוי שברצונך לבצע..."
                                className="flex-grow p-3 bg-transparent rounded-full focus:outline-none border-none"
                                disabled={isLoading || !originalImage}
                                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                            />
                            <button
                                onClick={handleGenerate}
                                disabled={isLoading || !prompt.trim() || !originalImage}
                                className="px-6 py-3 bg-blue-600 rounded-full text-white font-semibold disabled:bg-gray-400 hover:bg-blue-700 transition-colors m-1"
                            >
                                ערוך
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default ImageEditor;