import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage, StoryPart, AppMode, StoryPartImage } from '../types';
import { geminiService } from '../services/geminiService';
import { PaperAirplaneIcon, UserCircleIcon, SparklesIcon, StopCircleIcon, MicrophoneIcon, PlusIcon, ImageIcon, CameraIcon, DocumentPlusIcon, LiveChatIcon, PencilIcon, RefreshIcon, CopyIcon } from './Icons';
import Spinner from './Spinner';

// New Story Renderer with pagination
const StoryRenderer: React.FC<{ 
    storyParts: StoryPart[]; 
    onRegenerateImage: (partIndex: number, prompt: string) => void;
}> = ({ storyParts, onRegenerateImage }) => {
    const [currentPage, setCurrentPage] = useState(0);

    const pages = storyParts.reduce((acc, part, index) => {
        if (part.type === 'text') {
            acc.push({ text: part, image: undefined, partIndex: index });
        } else if (part.type === 'image' && acc.length > 0) {
            const lastPage = acc[acc.length - 1];
            if (!lastPage.image) {
                lastPage.image = part;
                lastPage.partIndex = index; // The index of the image part
            } else {
                 acc.push({ text: {type: 'text', content: ''}, image: part, partIndex: index });
            }
        }
        return acc;
    }, [] as { text: StoryPart, image?: StoryPartImage, partIndex: number }[]);

    const totalPages = pages.length;
    const currentPageData = pages[currentPage];

    const copyToClipboard = (content: string) => {
        navigator.clipboard.writeText(content).then(() => alert('הסיפור הועתק!'));
    };

    const handleExport = () => {
        let content = '';
        storyParts.forEach(part => {
            if (part.type === 'text') content += part.content + '\n\n';
            else if (part.type === 'image' && part.url) content += `[תמונה: ${part.prompt}]\n\n`;
        });
        copyToClipboard(content);
    };

    if (!currentPageData) return <div>טוען סיפור...</div>;

    return (
        <div className="p-2 bg-white rounded-lg shadow-inner">
             <div className="relative aspect-[4/5] w-full bg-purple-50 rounded-lg overflow-hidden flex flex-col justify-center items-center p-6 text-center">
                {currentPageData.image && currentPageData.image.status === 'loading' && (
                     <div className="flex flex-col items-center justify-center h-full">
                        <Spinner />
                        <p className="text-sm text-purple-600 mt-2">מצייר: {currentPageData.image.prompt}</p>
                    </div>
                )}
                 {currentPageData.image && currentPageData.image.status === 'loaded' && currentPageData.image.url && (
                    <img src={currentPageData.image.url} alt={currentPageData.image.prompt} className="absolute inset-0 w-full h-full object-cover" />
                )}
                 <div className="relative z-10 p-4 bg-black/40 text-white rounded-lg backdrop-blur-sm">
                    {currentPageData.text.type === 'text' && <p>{currentPageData.text.content}</p>}
                 </div>

                 {currentPageData.image && (
                     <button onClick={() => onRegenerateImage(currentPageData.partIndex, currentPageData.image!.prompt)} className="absolute top-2 right-2 z-20 p-1.5 bg-white/70 rounded-full text-purple-700 hover:bg-white transition-transform hover:scale-110 backdrop-blur-sm">
                        <RefreshIcon className="w-5 h-5" />
                    </button>
                 )}
            </div>
            <div className="flex justify-between items-center mt-2 px-2">
                <button onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0} className="px-3 py-1 text-xs bg-gray-200 rounded-full hover:bg-gray-300 disabled:opacity-50">&rarr;</button>
                <span className="text-xs font-mono">{currentPage + 1} / {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))} disabled={currentPage === totalPages - 1} className="px-3 py-1 text-xs bg-gray-200 rounded-full hover:bg-gray-300 disabled:opacity-50">&larr;</button>
            </div>
             <div className="mt-2 flex justify-end">
                <button onClick={handleExport} className="px-3 py-1 text-xs bg-gray-200 rounded-full hover:bg-gray-300 transition-transform hover:scale-105">העתק סיפור</button>
            </div>
        </div>
    );
};

// Enhanced Markdown Renderer with code block copying
const MarkdownRenderer = ({ text, isLoading }: { text: string, isLoading?: boolean }) => {
    const handleCopy = (code: string) => {
        navigator.clipboard.writeText(code);
    };

    const parts = text.split(/(```[\s\S]*?```)/g);

    return (
        <div>
            {parts.map((part, index) => {
                const codeMatch = part.match(/```(\w*)\n([\s\S]*?)```/);
                if (codeMatch) {
                    const [, language, code] = codeMatch;
                    return (
                        <div key={index} className="bg-gray-100 rounded-lg my-2 font-mono text-sm border border-gray-200">
                            <div className="flex justify-between items-center px-3 py-1 bg-gray-200 text-gray-600 rounded-t-lg">
                                <span className="text-gray-500">{language || 'code'}</span>
                                <button onClick={() => handleCopy(code)} className="flex items-center gap-1 text-gray-500 hover:text-gray-900 text-xs">
                                    <CopyIcon className="w-4 h-4" /> העתק
                                </button>
                            </div>
                            <pre className="p-3 whitespace-pre-wrap text-gray-800"><code>{code}</code></pre>
                        </div>
                    );
                }
                const html = part
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/^\* (.*$)/gim, '<li class="ml-4 list-disc">$1</li>')
                    .replace(/<\/ul>\s*<ul>/g, '')
                    .replace(/\n/g, '<br />');

                return <span key={index} dangerouslySetInnerHTML={{ __html: html }} />;
            })}
            {isLoading && <span className="blinking-cursor"></span>}
        </div>
    );
};


interface ChatProps {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  onStartLive: () => void;
  onOpenModal: (mode: AppMode) => void;
}

const SuggestionChip: React.FC<{ text: string, onClick: () => void }> = ({ text, onClick }) => (
    <button onClick={onClick} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors duration-200 font-medium">
        {text}
    </button>
);

const Chat: React.FC<ChatProps> = ({ messages, setMessages, onStartLive, onOpenModal }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [isStoryMode, setIsStoryMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<any>(null);


  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.lang = 'he-IL';
        recognitionRef.current.interimResults = false;
        
        recognitionRef.current.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setInput(prev => prev ? `${prev} ${transcript}`: transcript);
            setIsListening(false);
        };
        
        recognitionRef.current.onerror = (event: any) => {
            console.error('Speech recognition error', event.error);
            setIsListening(false);
        };

        recognitionRef.current.onend = () => {
            setIsListening(false);
        }
    }
  }, []);

  const handleMicClick = () => {
      if (!recognitionRef.current) return;

      if (isListening) {
          recognitionRef.current.stop();
      } else {
          recognitionRef.current.start();
          setIsListening(true);
      }
  };

  const handleSend = useCallback(async (textToSend?: string, messageHistory?: ChatMessage[]) => {
    const trimmedInput = textToSend || input.trim();
    if (!trimmedInput || isLoading) return;

    let finalInput = trimmedInput;
    let isStoryRequest = isStoryMode;

    if (isStoryMode) {
        finalInput = `צור סיפור קצר לילדים על ${trimmedInput}. עבור כל 2-3 משפטים, הוסף תיאור תמונה בפורמט [IMAGE: תיאור קצר של התמונה].`;
        setIsStoryMode(false);
    }
    
    const currentMessages = messageHistory || messages;
    const newMessages: ChatMessage[] = [...currentMessages, { id: `${Date.now()}`, role: 'user', text: trimmedInput }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    abortControllerRef.current = new AbortController();
    
    // FIX: Define placeholderMsgId outside the try block to make it accessible in the catch block.
    const placeholderMsgId = `${Date.now()}-model`;

    try {
      const history = newMessages.slice(0, -1).map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
      }));
      
      const chat = geminiService.getChatStream(history);
      const stream = await chat.sendMessageStream({ message: finalInput });

      let currentModelMessage = '';
      setMessages(prev => [...prev, { id: placeholderMsgId, role: 'model', text: '' }]);

      for await (const chunk of stream) {
        if (abortControllerRef.current.signal.aborted) {
          console.log("Stream aborted");
          break;
        }
        currentModelMessage += chunk.text;
        setMessages(prev => prev.map(m => m.id === placeholderMsgId ? { ...m, text: currentModelMessage } : m));
      }
      
      if (isStoryRequest) {
          const modelResponse = currentModelMessage;
          const storyParts: StoryPart[] = [];
          const imagePrompts: { prompt: string; partIndex: number }[] = [];
          
          modelResponse.split(/(\[IMAGE:.*?\])/g).forEach((part) => {
              const imageMatch = part.match(/\[IMAGE:(.*?)\]/);
              if (imageMatch) {
                  const prompt = imageMatch[1].trim();
                  const partIndex = storyParts.push({ type: 'image', prompt, status: 'loading' }) - 1;
                  imagePrompts.push({ prompt, partIndex });
              } else if (part.trim()) {
                  storyParts.push({ type: 'text', content: part.trim() });
              }
          });
          
          setMessages(prev => prev.map(m => m.id === placeholderMsgId ? { ...m, text: '', storyParts } : m));

          imagePrompts.forEach(async ({ prompt, partIndex }) => {
              try {
                  const base64Bytes = await geminiService.generateImage(prompt);
                  const url = `data:image/jpeg;base64,${base64Bytes}`;
                  setMessages(prev => prev.map(m => {
                      if (m.id === placeholderMsgId && m.storyParts) {
                          const newStoryParts = [...m.storyParts];
                          const storyPart = newStoryParts[partIndex];
                           if(storyPart && storyPart.type === 'image') {
                              newStoryParts[partIndex] = {...storyPart, url, status: 'loaded' };
                           }
                          return {...m, storyParts: newStoryParts};
                      }
                      return m;
                  }));
              } catch (e) {
                  console.error(`Failed to generate image for prompt: "${prompt}"`, e);
                   setMessages(prev => prev.map(m => {
                      if (m.id === placeholderMsgId && m.storyParts) {
                          const newStoryParts = [...m.storyParts];
                          const storyPart = newStoryParts[partIndex];
                           if(storyPart && storyPart.type === 'image') {
                              newStoryParts[partIndex] = {...storyPart, status: 'error' };
                           }
                          return {...m, storyParts: newStoryParts};
                      }
                      return m;
                  }));
              }
          });
      }

    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => {
        const placeholderExists = prev.some(msg => msg.id === placeholderMsgId);
        if (placeholderExists) {
            return prev.map(m => m.id === placeholderMsgId ? { ...m, text: 'מצטער, התרחשה שגיאה.' } : m);
        }
        return [...prev, { id: placeholderMsgId, role: 'model', text: 'מצטער, התרחשה שגיאה.' }];
      });
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [input, isLoading, messages, setMessages, isStoryMode]);
  
  const handleRegenerateImage = async (messageId: string, partIndex: number, prompt: string) => {
    setMessages(prev => prev.map(m => {
        if (m.id === messageId && m.storyParts) {
            const newParts = [...m.storyParts];
            const part = newParts[partIndex];
            if (part.type === 'image') newParts[partIndex] = {...part, status: 'loading'};
            return {...m, storyParts: newParts};
        }
        return m;
    }));
    try {
        const base64Bytes = await geminiService.generateImage(prompt);
        const url = `data:image/jpeg;base64,${base64Bytes}`;
        setMessages(prev => prev.map(m => {
            if (m.id === messageId && m.storyParts) {
                const newParts = [...m.storyParts];
                const part = newParts[partIndex];
                if (part.type === 'image') newParts[partIndex] = {...part, url, status: 'loaded'};
                return {...m, storyParts: newParts};
            }
            return m;
        }));
    } catch (e) {
        console.error("Image regeneration failed", e);
        setMessages(prev => prev.map(m => {
            if (m.id === messageId && m.storyParts) {
                const newParts = [...m.storyParts];
                const part = newParts[partIndex];
                if (part.type === 'image') newParts[partIndex] = {...part, status: 'error'};
                return {...m, storyParts: newParts};
            }
            return m;
        }));
    }
  };

  const handleEditAndResubmit = (messageId: string, newText: string) => {
      const messageIndex = messages.findIndex(m => m.id === messageId);
      if (messageIndex === -1) return;
      
      const historyToPreserve = messages.slice(0, messageIndex);
      setEditingMessageId(null);
      setEditText('');
      handleSend(newText, historyToPreserve);
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  };
  
  const handleSuggestionClick = (action: AppMode | 'story') => {
    if (action === 'story') {
        setIsStoryMode(true);
    } else {
        onOpenModal(action);
    }
  };

  return (
    <div className="flex flex-col h-full w-full flex-grow justify-end">
      {messages.length > 0 && (
        <div className="flex-grow overflow-y-auto pr-2 space-y-4 pb-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 items-start fade-in group ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'model' && <div className="w-8 h-8 flex-shrink-0 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center shadow-md"><SparklesIcon className="w-5 h-5 text-white" /></div>}
              <div className={`max-w-xl p-3 rounded-2xl shadow-sm relative ${msg.role === 'user' ? 'bg-blue-100 text-blue-900 rounded-br-none' : 'bg-gray-100 text-gray-800 rounded-bl-none'}`}>
                {editingMessageId === msg.id ? (
                    <div>
                        <textarea value={editText} onChange={e => setEditText(e.target.value)} className="w-full bg-white p-2 rounded-md border border-purple-300 focus:outline-none"/>
                        <div className="flex justify-end gap-2 mt-2">
                             <button onClick={() => setEditingMessageId(null)} className="text-xs px-2 py-1">בטל</button>
                             <button onClick={() => handleEditAndResubmit(msg.id, editText)} className="text-xs px-2 py-1 bg-purple-600 text-white rounded-md">שמור ושלח</button>
                        </div>
                    </div>
                ) : (
                   <>
                    { msg.storyParts ? <StoryRenderer storyParts={msg.storyParts} onRegenerateImage={(partIndex, prompt) => handleRegenerateImage(msg.id, partIndex, prompt)} /> : <MarkdownRenderer text={msg.text} isLoading={isLoading && msg.id.endsWith('-model')} /> }
                    {msg.role === 'user' && !isLoading && (
                        <button onClick={() => { setEditingMessageId(msg.id); setEditText(msg.text); }} className="absolute top-1 left-1 p-1 rounded-full bg-white/50 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                            <PencilIcon className="w-4 h-4" />
                        </button>
                    )}
                   </>
                )}
              </div>
              {msg.role === 'user' && <div className="w-8 h-8 flex-shrink-0 rounded-full bg-gray-200 flex items-center justify-center"><UserCircleIcon className="w-6 h-6 text-gray-500" /></div>}
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
      )}
      
      <div className={`w-full max-w-3xl mx-auto mt-auto fade-in`}>
        <div className="flex justify-center gap-2 mb-3 flex-wrap">
            <SuggestionChip text="יצירת סיפורים" onClick={() => handleSuggestionClick('story')} />
            <SuggestionChip text="יצירת סרטון" onClick={() => handleSuggestionClick(AppMode.VideoCreate)} />
            <SuggestionChip text="יצירת תמונה" onClick={() => handleSuggestionClick(AppMode.ImageCreate)} />
            <SuggestionChip text="עריכת תמונה" onClick={() => handleSuggestionClick(AppMode.ImageEdit)} />
        </div>

         <div className="relative p-0.5 rounded-full bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 animated-gradient shadow-lg" style={{backgroundSize: '400% 400%'}}>
           <div className="relative flex items-center bg-white rounded-full w-full">
                
                <div className="relative ps-2">
                     <button onClick={() => setIsAttachmentMenuOpen(prev => !prev)} className="p-3 text-gray-500 hover:text-purple-600 transition-colors">
                        <PlusIcon className="w-6 h-6"/>
                    </button>
                    {isAttachmentMenuOpen && (
                        <div className="absolute bottom-full right-0 mb-2 flex flex-col gap-2 bg-white p-2 rounded-lg shadow-xl border border-gray-100">
                             <button className="flex items-center gap-2 p-2 w-full text-right text-gray-700 hover:bg-gray-100 rounded-md"><ImageIcon className="w-5 h-5"/><span>הוסף תמונה</span></button>
                             <button className="flex items-center gap-2 p-2 w-full text-right text-gray-700 hover:bg-gray-100 rounded-md"><CameraIcon className="w-5 h-5"/><span>צלם תמונה</span></button>
                             <button className="flex items-center gap-2 p-2 w-full text-right text-gray-700 hover:bg-gray-100 rounded-md"><DocumentPlusIcon className="w-5 h-5"/><span>הוסף קובץ</span></button>
                        </div>
                    )}
                </div>
               
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                        }
                    }}
                    placeholder={isStoryMode ? "כתוב נושא לסיפור..." : "כתוב הודעה לאייבן..."}
                    className="w-full p-3 bg-transparent focus:outline-none resize-none h-full text-lg"
                    rows={1}
                    disabled={isLoading}
                />
                
                 <div className="p-2 flex items-center gap-1">
                    <button onClick={handleMicClick} className={`p-3 rounded-full transition-colors ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-gray-500 hover:bg-gray-100'}`}>
                        <MicrophoneIcon className="w-6 h-6" />
                    </button>
                    {isLoading ? (
                        <button onClick={handleStop} className="p-3 bg-red-100 rounded-full text-red-600 hover:bg-red-200 transition-colors">
                            <StopCircleIcon className="w-6 h-6" />
                        </button>
                    ) : input.trim() ? (
                        <button onClick={() => handleSend()} className="p-3 bg-purple-600 rounded-full text-white hover:bg-purple-700 transition-colors">
                            <PaperAirplaneIcon className="w-6 h-6" />
                        </button>
                    ) : (
                         <button onClick={onStartLive} className="p-3 bg-transparent rounded-full text-purple-600 hover:bg-purple-100 transition-colors">
                            <LiveChatIcon className="w-6 h-6" />
                        </button>
                    )}
                </div>
           </div>
         </div>
      </div>
    </div>
  );
};

export default Chat;