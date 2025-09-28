import React from 'react';
import { AppMode } from '../types';
import { ChatBubbleIcon, MicrophoneIcon, ImageIcon, ScissorsIcon, FilmIcon } from './Icons';

interface NavigationProps {
  currentMode: AppMode;
  onModeChange: (mode: AppMode) => void;
}

const icons: Record<AppMode, React.ReactNode> = {
  [AppMode.Chat]: <ChatBubbleIcon className="w-5 h-5" />,
  [AppMode.Live]: <MicrophoneIcon className="w-5 h-5" />,
  [AppMode.ImageCreate]: <ImageIcon className="w-5 h-5" />,
  [AppMode.ImageEdit]: <ScissorsIcon className="w-5 h-5" />,
  [AppMode.VideoCreate]: <FilmIcon className="w-5 h-5" />,
};

const Navigation: React.FC<NavigationProps> = ({ currentMode, onModeChange }) => {
  return (
    <nav className="flex justify-center flex-wrap gap-2 p-2 rounded-full bg-gray-100/80 backdrop-blur-sm">
      {(Object.values(AppMode) as AppMode[]).map((mode) => (
        <button
          key={mode}
          onClick={() => onModeChange(mode)}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-purple-500 ${
            currentMode === mode
              ? 'bg-purple-600 text-white'
              : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
          }`}
        >
          {icons[mode]}
          {mode}
        </button>
      ))}
    </nav>
  );
};

export default Navigation;