
import React, { useState, useEffect } from 'react';
import { User, Notification } from '../types';
import * as storageService from '../services/storageService';
import Avatar from './Avatar';
import Button from './Button';
import { Bell, Heart, MessageCircle, UserPlus, Trash2, X, Check, ShieldCheck, Sparkles } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface NotificationsViewProps {
  currentUser: User;
}

const NotificationsView: React.FC<NotificationsViewProps> = ({ currentUser }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [actors, setActors] = useState<Record<string, User>>({});

  useEffect(() => {
    const unsubscribe = storageService.subscribeToNotifications(currentUser.id, async (notifs) => {
        setNotifications(notifs);
        
        const missingIds = notifs
          .map(n => n.actorId)
          .filter((id): id is string => !!id && !actors[id]);

        if (missingIds.length > 0) {
            const fetched = await Promise.all(missingIds.map(id => storageService.getUserById(id)));
            const newActors = { ...actors };
            fetched.forEach(u => { if (u) newActors[u.id] = u; });
            setActors(newActors);
        }
        setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser.id, actors]);

  const handleAction = async (notif: Notification, accept: boolean, e?: React.MouseEvent) => {
      if (e) e.stopPropagation(); // Prevent row click from firing
      if (notif.type === 'FRIEND_REQ' && notif.actorId) {
          if (accept) {
              await storageService.acceptFriendRequest(currentUser.id, notif.actorId);
          } else {
              await storageService.declineFriendRequest(currentUser.id, notif.actorId);
          }
          await storageService.deleteNotification(notif.id);
      }
  };

  const handleNotificationClick = async (notif: Notification) => {
      if (!notif.isRead) {
          await storageService.markNotificationAsRead(notif.id);
      }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      await storageService.deleteNotification(id);
  };

  const getIcon = (type: Notification['type']) => {
      switch(type) {
          case 'LIKE': return <Heart size={14} className="text-red-500 fill-current" />;
          case 'COMMENT': return <MessageCircle size={14} className="text-blue-400" />;
          case 'FRIEND_REQ': return <UserPlus size={14} className="text-green-400" />;
          case 'FRIEND_ACCEPT': return <ShieldCheck size={14} className="text-primary-400" />;
          case 'MENTION': return <Sparkles size={14} className="text-purple-400" />;
          default: return <Bell size={14} className="text-gray-400" />;
      }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-300 pb-20">
      <div className="flex items-center justify-between px-4 md:px-0">
          <div>
            <h2 className="text-2xl font-bold text-white">Notifications</h2>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-widest mt-1">Updates and Activity</p>
          </div>
          {notifications.length > 0 && (
              <button 
                onClick={() => storageService.deleteAllNotifications(currentUser.id)} 
                className="text-xs text-gray-500 hover:text-red-400 transition-colors flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-full border border-white/5"
              >
                  <Trash2 size={12} /> Clear All
              </button>
          )}
      </div>

      <div className="space-y-2 px-4 md:px-0">
          {loading ? (
              <div className="p-12 text-center text-gray-500 animate-pulse bg-white/5 rounded-2xl border border-white/5">
                Loading notifications...
              </div>
          ) : notifications.length === 0 ? (
              <div className="aero-card p-16 text-center text-gray-500 rounded-3xl border border-white/5">
                  <div className="relative inline-block mb-6">
                    <Bell size={64} className="mx-auto opacity-10" />
                    <div className="absolute inset-0 bg-primary-500/10 blur-2xl rounded-full"></div>
                  </div>
                  <p className="text-lg font-medium text-gray-400">No notifications yet.</p>
                  <p className="text-sm text-gray-600 mt-1">When someone interacts with you, it will show up here.</p>
              </div>
          ) : (
              notifications.map(notif => {
                  const actor = notif.actorId ? actors[notif.actorId] : null;
                  const isReq = notif.type === 'FRIEND_REQ';

                  return (
                    <div 
                        key={notif.id} 
                        onClick={() => handleNotificationClick(notif)}
                        className={`aero-card p-4 rounded-2xl flex items-start gap-4 transition-all cursor-pointer group border-l-4 ${
                            !notif.isRead 
                                ? 'border-l-primary-500 bg-primary-500/10 shadow-[0_0_20px_rgba(79,172,254,0.15)] hover:bg-primary-500/15' 
                                : 'border-l-transparent hover:bg-white/5'
                        }`}
                    >
                        <div className="relative flex-shrink-0">
                            {actor ? (
                              <Avatar src={actor.avatarUrl} alt="" size="md" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                                {getIcon(notif.type)}
                              </div>
                            )}
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-charcoal-900 rounded-full flex items-center justify-center border border-white/10 shadow-lg text-[10px]">
                                {getIcon(notif.type)}
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className={`text-sm leading-snug ${!notif.isRead ? 'text-white font-medium' : 'text-gray-400'}`}>
                                {actor && <span className={`mr-1.5 ${!notif.isRead ? 'font-black text-white' : 'font-bold text-gray-300'}`}>{actor.name}</span>}
                                {notif.content}
                            </p>
                            <p className="text-[10px] text-gray-500 mt-1.5 font-mono uppercase tracking-tighter">
                              {formatDistanceToNow(notif.createdAt, { addSuffix: true })}
                            </p>
                            
                            {isReq && !notif.isRead && (
                                <div className="flex gap-2 mt-4 animate-in slide-in-from-top-1 duration-300">
                                    <Button size="sm" onClick={(e: any) => handleAction(notif, true, e)} className="h-8 py-0 shadow-lg shadow-primary-500/10" icon={<Check size={14}/>}>
                                      Confirm
                                    </Button>
                                    <Button size="sm" variant="secondary" onClick={(e: any) => handleAction(notif, false, e)} className="h-8 py-0">
                                      Ignore
                                    </Button>
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={(e) => handleDelete(notif.id, e)} 
                              className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-white/10 rounded-lg transition-all"
                              title="Dismiss"
                            >
                              <X size={14}/>
                            </button>
                        </div>
                    </div>
                  );
              })
          )}
      </div>
    </div>
  );
};

export default NotificationsView;
