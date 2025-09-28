import React, { useState } from 'react';
import { AppMode, ChatMessage } from './types';
import Header from './components/Header';
import Chat from './components/Chat';
import Live from './components/Live';
import ImageCreator from './components/ImageCreator';
import ImageEditor from './components/ImageEditor';
import VideoCreator from './components/VideoCreator';

const App: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeModal, setActiveModal] = useState<AppMode | null>(null);

  const openModal = (mode: AppMode) => setActiveModal(mode);
  const closeModal = () => setActiveModal(null);

  const hasStartedChat = messages.length > 0;

  const addMessage = (message: Omit<ChatMessage, 'id'>) => {
    setMessages(prev => [...prev, { ...message, id: `${Date.now()}-${Math.random()}` }]);
  };

  const handleSetMessages = (newMessages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
    // Ensure all messages have IDs when state is updated
    const updateFn = (prev: ChatMessage[]) => {
      const updated = typeof newMessages === 'function' ? newMessages(prev) : newMessages;
      return updated.map(m => m.id ? m : { ...m, id: `${Date.now()}-${Math.random()}` });
    };
    setMessages(updateFn);
  };


  return (
    <div className="min-h-screen text-gray-800 flex flex-col font-sans">
      {hasStartedChat ? (
        <>
          <Header isCentered={false} />
          <main className="flex-grow flex flex-col p-4 md:p-6 lg:p-8 overflow-y-hidden w-full">
            <div className="w-full max-w-4xl mx-auto flex flex-col flex-grow h-full">
              <Chat
                messages={messages}
                setMessages={handleSetMessages}
                onStartLive={() => openModal(AppMode.Live)}
                onOpenModal={openModal}
              />
            </div>
          </main>
        </>
      ) : (
        <div className="flex-grow flex flex-col">
            <div className="flex-grow flex flex-col justify-center items-center text-center p-4 fade-in">
                 <Header isCentered={true} />
                 <h2 className="text-2xl md:text-3xl font-medium text-gray-600 mt-4">איך אוכל לעזור לך?</h2>
            </div>
            <div className="p-4 md:p-6 lg:p-8 pt-0 w-full">
                <div className="w-full max-w-4xl mx-auto">
                     <Chat
                        messages={messages}
                        setMessages={handleSetMessages}
                        onStartLive={() => openModal(AppMode.Live)}
                        onOpenModal={openModal}
                    />
                </div>
            </div>
        </div>
      )}

      {/* Modals */}
      <Live isOpen={activeModal === AppMode.Live} onClose={closeModal} />
      <ImageCreator isOpen={activeModal === AppMode.ImageCreate} onClose={closeModal} />
      <ImageEditor isOpen={activeModal === AppMode.ImageEdit} onClose={closeModal} />
      <VideoCreator isOpen={activeModal === AppMode.VideoCreate} onClose={closeModal} />
    </div>
  );
};

export default App;