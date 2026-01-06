
import React, { useState, useRef } from 'react';
import { Sparkles, Image as ImageIcon, X, Globe, Users, Video } from 'lucide-react';
import { User } from '../types';
import Button from './Button';
import Avatar from './Avatar';
import * as geminiService from '../services/geminiService';
import * as storageService from '../services/storageService';

interface CreatePostProps {
  currentUser: User | null;
  onPostCreate: (content: string, image?: string, tags?: string[], visibility?: 'public' | 'friends', communityId?: string) => void;
  communityId?: string; // Optional context: posting into a community
}

const CreatePost: React.FC<CreatePostProps> = ({ currentUser, onPostCreate, communityId }) => {
  const [content, setContent] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);
  const [visibility, setVisibility] = useState<'public' | 'friends'>(currentUser?.preferences?.privacy?.defaultPostVisibility || 'public');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!currentUser) return null;

  const handleEnhance = async () => {
    if (!content.trim()) return;
    setIsEnhancing(true);
    const improved = await geminiService.enhancePostContent(content);
    setContent(improved);
    setIsEnhancing(false);
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      // Actual file upload to VPS
      const fileUrl = await storageService.uploadFile(file);
      if (fileUrl) {
          setSelectedImage(fileUrl);
          
          // Auto-generate caption using base64 for Gemini (since it needs raw bytes)
          if (!content.trim()) {
             setIsGeneratingCaption(true);
             const reader = new FileReader();
             reader.onloadend = async () => {
                const base64 = (reader.result as string).split(',')[1];
                const caption = await geminiService.generateImageCaption(base64);
                setContent(caption);
                setIsGeneratingCaption(false);
             };
             reader.readAsDataURL(file);
          }
      }
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!content.trim() && !selectedImage) return;
    
    onPostCreate(content, selectedImage || undefined, [], visibility, communityId);
    setContent('');
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const showMagicPolish = !communityId && visibility === 'public';

  return (
    <div className="aero-card rounded-xl p-4 mb-6 z-0">
      <div className="flex gap-4 relative z-10">
        <div className="flex-shrink-0">
          <Avatar src={currentUser.avatarUrl} alt={currentUser.name} />
        </div>
        <div className="flex-grow">
          {!communityId && (
            <div className="flex mb-2">
                <button 
                    onClick={() => setVisibility(visibility === 'public' ? 'friends' : 'public')}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-primary-400 hover:bg-white/10 transition-colors"
                >
                    {visibility === 'public' ? <Globe size={12} /> : <Users size={12} />}
                    <span>{visibility === 'public' ? 'Public' : 'Friends Only'}</span>
                </button>
            </div>
          )}

          <textarea
            className="w-full min-h-[100px] p-2 bg-transparent text-gray-100 placeholder-gray-500 focus:outline-none resize-none text-base"
            placeholder={isGeneratingCaption ? "Analyzing media..." : (communityId ? "Write something to the community..." : "What's happening? Type @ to mention or # to tag.")}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={isEnhancing || isGeneratingCaption || isUploading}
          />
          
          {selectedImage && (
            <div className="relative mb-4 inline-block">
              <img src={selectedImage} alt="Selected" className="max-h-64 rounded-lg border border-white/20 shadow-md" />
              <button 
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 p-1 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors backdrop-blur-sm"
              >
                <X size={16} />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-white/10 pt-3 mt-2">
            <div className="flex gap-2">
              <button 
                className={`p-2 rounded-full transition-colors relative group ${isUploading ? 'text-gray-500 animate-pulse' : 'text-primary-500 hover:bg-white/10'}`}
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                title="Add Photo"
              >
                <ImageIcon size={20} />
              </button>
              
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*,video/*"
                onChange={handleImageSelect}
              />
              
              {showMagicPolish && (
                  <button 
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      content.trim().length > 5 
                        ? 'text-purple-300 bg-purple-500/20 hover:bg-purple-500/30' 
                        : 'text-gray-500 bg-white/5 cursor-not-allowed'
                    }`}
                    onClick={handleEnhance}
                    disabled={content.trim().length <= 5 || isEnhancing}
                    title="Enhance text with Gemini AI"
                  >
                    <Sparkles size={14} className={isEnhancing ? 'animate-pulse' : ''} />
                    <span className="hidden sm:inline">{isEnhancing ? 'Enhancing...' : 'Magic Polish'}</span>
                  </button>
              )}
            </div>
            
            <Button 
                onClick={handleSubmit} 
                disabled={(!content.trim() && !selectedImage) || isUploading}
                isLoading={isUploading}
            >
              Post
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePost;
