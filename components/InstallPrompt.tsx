import React, { useState, useEffect } from 'react';
import { X, Share, Download, Smartphone } from 'lucide-react';
import Button from './Button';
import Logo from './Logo';

const InstallPrompt: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed)
    const isRunningStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    setIsStandalone(isRunningStandalone);

    if (isRunningStandalone) return;

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Chrome/Android/Desktop event listener
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show prompt after a small delay to not be intrusive immediately
      setTimeout(() => setIsVisible(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // For iOS, show after delay if not in standalone
    if (isIosDevice) {
       // Check if we've already shown it this session to avoid annoyance
       const hasShown = sessionStorage.getItem('installPromptShown');
       if (!hasShown) {
         setTimeout(() => setIsVisible(true), 3000);
       }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsVisible(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    sessionStorage.setItem('installPromptShown', 'true');
  };

  if (!isVisible || isStandalone) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-charcoal-800/90 border border-white/20 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in slide-in-from-bottom-10 zoom-in-95 backdrop-blur-xl">
        
        {/* Header Image / Branding */}
        <div className="bg-gradient-primary h-24 relative flex items-center justify-center">
            <div className="bg-charcoal-900 p-2 rounded-xl shadow-lg border border-white/10 relative top-6">
                <Logo size="sm" />
            </div>
            <button 
                onClick={handleClose}
                className="absolute top-2 right-2 p-1 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors"
            >
                <X size={16} />
            </button>
        </div>

        <div className="pt-10 pb-6 px-6 text-center">
            <h3 className="text-xl font-bold text-white mb-2">Install App</h3>
            <p className="text-sm text-gray-300 mb-6">
                Add <span className="text-primary-400 font-semibold">GlassKom</span> to your home screen for the best experience. Faster access and fullscreen view.
            </p>

            {isIOS ? (
                <div className="space-y-4 text-left bg-white/5 p-4 rounded-xl border border-white/5">
                    <div className="flex items-center gap-3 text-sm text-gray-200">
                        <span className="flex items-center justify-center w-6 h-6 rounded bg-gray-700 text-blue-400">
                            <Share size={14} />
                        </span>
                        <span>1. Tap the <strong>Share</strong> button below</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-200">
                         <span className="flex items-center justify-center w-6 h-6 rounded bg-gray-700 text-gray-300">
                            <Download size={14} />
                        </span>
                        <span>2. Select <strong>Add to Home Screen</strong></span>
                    </div>
                     <div className="flex justify-center mt-2">
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Smartphone size={12} /> IOS Device Detected
                        </span>
                    </div>
                </div>
            ) : (
                <Button 
                    onClick={handleInstallClick} 
                    className="w-full justify-center py-3 text-base shadow-lg shadow-primary-500/20"
                >
                    Add to Home Screen
                </Button>
            )}
        </div>
        
        {!isIOS && (
            <div className="bg-black/20 p-3 text-center">
                <button onClick={handleClose} className="text-xs text-gray-500 hover:text-white transition-colors">
                    Maybe later
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default InstallPrompt;