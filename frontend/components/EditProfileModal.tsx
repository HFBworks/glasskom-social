import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';
import Button from './Button';
import { X, Camera, Upload } from 'lucide-react';

interface EditProfileModalProps {
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedUser: User) => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ currentUser, isOpen, onClose, onSave }) => {
  const [name, setName] = useState(currentUser.name);
  const [handle, setHandle] = useState(currentUser.handle);
  const [bio, setBio] = useState(currentUser.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl);
  const [coverUrl, setCoverUrl] = useState(currentUser.coverUrl || '');
  
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens or user changes
  useEffect(() => {
    if (isOpen) {
        setName(currentUser.name);
        setHandle(currentUser.handle);
        setBio(currentUser.bio || '');
        setAvatarUrl(currentUser.avatarUrl);
        setCoverUrl(currentUser.coverUrl || '');
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setUrl: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Ensure handle has @
    const formattedHandle = handle.trim().startsWith('@') 
        ? handle.trim() 
        : `@${handle.trim()}`;

    const updatedUser: User = {
      ...currentUser,
      name: name.trim(),
      handle: formattedHandle,
      bio: bio.trim(),
      avatarUrl,
      coverUrl,
    };
    
    onSave(updatedUser);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="aero-card rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-white/10">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">Edit Profile</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-white/10 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[80vh]">
          {/* Cover Image */}
          <div className="relative h-32 bg-gray-800 group">
            {coverUrl ? (
              <img src={coverUrl} alt="Cover" className="w-full h-full object-cover opacity-80" />
            ) : (
              <div className="w-full h-full bg-gradient-primary opacity-60"></div>
            )}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                type="button"
                onClick={() => coverInputRef.current?.click()}
                className="p-2 bg-black/60 rounded-full text-white hover:bg-black/80 flex items-center gap-2 text-sm font-medium backdrop-blur-sm border border-white/20"
              >
                <Camera size={16} />
                <span>Change Cover</span>
              </button>
            </div>
            <input 
              type="file" 
              ref={coverInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={(e) => handleFileChange(e, setCoverUrl)}
            />
          </div>

          {/* Avatar - Negative margin to overlap cover */}
          <div className="px-6 -mt-12 mb-6">
            <div className="relative inline-block group">
              <img 
                src={avatarUrl} 
                alt="Avatar" 
                className="w-24 h-24 rounded-full object-cover border-4 border-charcoal-900 bg-charcoal-800 shadow-lg"
              />
               <div className="absolute inset-0 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                 <Camera size={24} className="text-white drop-shadow-md" />
               </div>
              <input 
                type="file" 
                ref={avatarInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={(e) => handleFileChange(e, setAvatarUrl)}
              />
            </div>
          </div>

          {/* Fields */}
          <div className="px-6 pb-6 space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-1">Name</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full aero-input rounded-lg p-2.5 outline-none"
                required
                placeholder="Your Display Name"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-300 mb-1">Username</label>
              <input 
                type="text" 
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                className="w-full aero-input rounded-lg p-2.5 outline-none"
                required
                placeholder="@username"
              />
              <p className="text-xs text-gray-500 mt-1">This is how others will mention you.</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-300 mb-1">Bio</label>
              <textarea 
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                maxLength={160}
                className="w-full aero-input rounded-lg p-2.5 outline-none resize-none"
                placeholder="Tell the world about yourself..."
              />
              <div className="text-right text-xs text-gray-500">
                {bio.length}/160
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-white/10 flex justify-end gap-3 bg-white/5">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfileModal;