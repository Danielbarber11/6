import React from 'react';

interface HeaderProps {
    isCentered: boolean;
}

const Header: React.FC<HeaderProps> = ({ isCentered }) => {
  return (
    <header className={`p-4 transition-all duration-500 ${isCentered ? 'text-center' : 'text-center pt-4 pb-0'}`}>
      <div className={`inline-flex items-center gap-3 transition-all duration-500 ${isCentered ? '' : 'scale-75 -mb-2'}`}>
        <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-yellow-500 text-transparent bg-clip-text animated-gradient">
          אייבן
        </h1>
      </div>
    </header>
  );
};

export default Header;