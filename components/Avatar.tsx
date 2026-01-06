
import React from 'react';

interface AvatarProps {
  src?: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isGuest?: boolean;
}

const Avatar: React.FC<AvatarProps> = ({ src, alt, size = 'md', isGuest = false }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-24 h-24'
  };

  if (isGuest) {
    return (
      <div className={`${sizeClasses[size]} rounded-full relative flex items-center justify-center overflow-hidden bg-black shadow-lg border border-white/10 shrink-0 group`} title="GK Assistant (Guest Mode)">
        {/* Iridescent Layered Gradients */}
        <div className="absolute inset-0 bg-gradient-to-tr from-orange-500 via-blue-500 to-purple-600 opacity-80 animate-vibrant-spin"></div>
        <div className="absolute inset-0 bg-gradient-to-bl from-teal-400 via-purple-500 to-orange-400 opacity-60 mix-blend-overlay animate-vibrant-spin-reverse"></div>
        
        {/* Glass Reflection & Depth */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.7),transparent_60%)] z-10"></div>
        <div className="absolute inset-[15%] rounded-full bg-white/20 blur-md z-20 animate-pulse"></div>
        
        {/* Inner Core */}
        <div className="absolute inset-[30%] rounded-full bg-white/40 blur-sm z-30"></div>
        
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes vibrant-spin {
            0% { transform: rotate(0deg) scale(1); }
            50% { transform: rotate(180deg) scale(1.1); }
            100% { transform: rotate(360deg) scale(1); }
          }
          @keyframes vibrant-spin-reverse {
            0% { transform: rotate(360deg) scale(1.2); }
            50% { transform: rotate(180deg) scale(1); }
            100% { transform: rotate(0deg) scale(1.2); }
          }
          .animate-vibrant-spin {
            animation: vibrant-spin 4s linear infinite;
          }
          .animate-vibrant-spin-reverse {
            animation: vibrant-spin-reverse 6s linear infinite;
          }
        `}} />
      </div>
    );
  }

  return (
    <img 
      src={src || ''} 
      alt={alt} 
      className={`${sizeClasses[size]} rounded-full object-cover border border-gray-200 bg-gray-100 shrink-0`}
    />
  );
};

export default Avatar;
