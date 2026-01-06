import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showSubtitle?: boolean;
}

const Logo: React.FC<LogoProps> = ({ size = 'md', className = '', showSubtitle }) => {
  // Styles based on size
  const sizes = {
    sm: { container: 'h-8', text: 'text-2xl', sub: 'text-[0.5rem]', shadow: 'drop-shadow-[0_0_2px_rgba(255,255,255,0.5)]' },
    md: { container: 'h-12', text: 'text-4xl', sub: 'text-[0.6rem]', shadow: 'drop-shadow-[0_0_8px_rgba(79,172,254,0.5)]' },
    lg: { container: 'h-16', text: 'text-5xl', sub: 'text-xs', shadow: 'drop-shadow-[0_0_10px_rgba(79,172,254,0.5)]' },
    xl: { container: 'h-24', text: 'text-7xl', sub: 'text-sm', shadow: 'drop-shadow-[0_0_15px_rgba(79,172,254,0.5)]' },
  };

  const s = sizes[size];
  
  // Default showSubtitle to true for larger sizes, false for sm unless overridden
  const shouldShowSubtitle = showSubtitle !== undefined ? showSubtitle : size !== 'sm';

  return (
    <div className={`flex flex-col items-center justify-center select-none ${className}`}>
      <div className={`relative flex items-center justify-center font-['Arial'] font-black tracking-tighter leading-none ${s.text}`}>
        {/* Text with Gradient */}
        <span className={`relative z-10 bg-clip-text text-transparent bg-gradient-to-tr from-white via-blue-200 to-primary-500 ${s.shadow} text-center`}>
            GK
        </span>
      </div>
      
      {shouldShowSubtitle && (
        <div className={`font-['Inter'] font-medium tracking-[0.3em] text-primary-500 uppercase ${s.sub} mt-1 flex items-center justify-center gap-1 opacity-90`}>
          <span className="w-0.5 h-0.5 rounded-full bg-primary-500"></span>
          social
          <span className="w-0.5 h-0.5 rounded-full bg-primary-500"></span>
        </div>
      )}
    </div>
  );
};

export default Logo;