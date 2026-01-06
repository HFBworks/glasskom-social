
import React, { useState } from 'react';
import { User } from '../types';
import Button from './Button';
import { Mail, Lock, User as UserIcon, AtSign, X } from 'lucide-react';
import * as storageService from '../services/storageService';
import Logo from './Logo';

interface AuthProps {
  onLogin: () => void;
  variant?: 'full' | 'modal';
  onClose?: () => void;
  initialMode?: 'login' | 'register';
}

const Auth: React.FC<AuthProps> = ({ onLogin, variant = 'full', onClose, initialMode = 'login' }) => {
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isLogin) {
        if (email && password) {
          await storageService.login(email, password);
          onLogin();
        } else {
          setError('Please enter both email and password.');
        }
      } else {
        if (email && password && name && handle) {
          const formattedHandle = handle.startsWith('@') ? handle : `@${handle.replace(/\s+/g, '')}`;
          const newUser: User = {
            id: '', 
            name: name,
            handle: formattedHandle.toLowerCase(),
            email: email,
            avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
            coverUrl: '',
            bio: 'Just joined the community!'
          };
          await storageService.register(newUser, password);
          onLogin();
        } else {
          setError('Please fill in all fields.');
        }
      }
    } catch (e: any) {
      setError(e.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const containerClasses = variant === 'full' 
    ? "min-h-screen flex items-center justify-center bg-charcoal-900 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] p-4"
    : "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in";

  return (
    <div className={containerClasses}>
      {variant === 'full' && (
        <>
          <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-primary-600/20 rounded-full blur-[100px] pointer-events-none"></div>
          <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/20 rounded-full blur-[100px] pointer-events-none"></div>
        </>
      )}

      <div className={`aero-card w-full max-w-md rounded-2xl p-8 shadow-2xl relative z-10 border border-white/10 ${variant === 'modal' ? 'animate-in zoom-in-95' : ''}`}>
        
        {variant === 'modal' && onClose && (
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                <X size={20} />
            </button>
        )}

        <div className="flex flex-col items-center mb-8">
          <div className="mb-6 hover:scale-105 transition-transform duration-300">
             <Logo size="xl" showSubtitle />
          </div>
          <p className="text-gray-400 text-center text-sm">
            {isLogin ? 'Welcome back! Sign in to join the conversation.' : 'Create an account to explore the nebula.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="relative group">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary-400 transition-colors" size={18} />
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full aero-input rounded-xl py-3 pl-10 pr-4 text-sm outline-none"
                autoComplete="name"
              />
            </div>
          )}

          {!isLogin && (
            <div className="relative group">
              <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary-400 transition-colors" size={18} />
              <input
                type="text"
                placeholder="Handle (e.g. cooluser)"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                className="w-full aero-input rounded-xl py-3 pl-10 pr-4 text-sm outline-none"
                autoComplete="nickname"
              />
            </div>
          )}

          <div className="relative group">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary-400 transition-colors" size={18} />
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full aero-input rounded-xl py-3 pl-10 pr-4 text-sm outline-none"
              autoComplete="username"
            />
          </div>

          <div className="relative group">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary-400 transition-colors" size={18} />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full aero-input rounded-xl py-3 pl-10 pr-4 text-sm outline-none"
              autoComplete={isLogin ? "current-password" : "new-password"}
            />
          </div>

          {error && <p className="text-red-300 text-[11px] text-center bg-red-500/10 p-2 rounded-lg border border-red-500/20">{error}</p>}

          <Button 
            type="submit" 
            className="w-full py-3" 
            isLoading={isLoading}
          >
            {isLogin ? 'Sign In' : 'Join Now'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-400 text-sm">
            {isLogin ? "New here?" : "Joined before?"}
            <button
              onClick={() => {
                setIsLogin(!isLogin); 
                setError('');
              }}
              className="ml-2 font-semibold text-primary-400 hover:text-primary-300 transition-colors"
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
