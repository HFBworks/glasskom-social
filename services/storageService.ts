
import { User, Post, Comment, Chat, Message, Notification, AI_AGENT_ID, Community, CommunityRole, ChatFolder } from '../types';
import { auth, db } from './firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  deleteUser
} from "firebase/auth";
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  where, 
  deleteDoc, 
  Timestamp,
  getDocs,
  writeBatch
} from "firebase/firestore";

// --- DYNAMIC VPS CONFIGURATION ---
const getBackendBaseUrl = () => {
    if (typeof window === 'undefined') return 'http://localhost:3001';
    const hostname = window.location.hostname;
    
    // Production VPS Setup
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
        return `${window.location.protocol}//${hostname}`;
    }
    
    return 'http://localhost:3001';
};

const BASE_URL = getBackendBaseUrl();
const BACKEND_URL = `${BASE_URL}/api`;

/**
 * LOCAL PERSISTENCE ENGINE
 */
const LocalDB = {
    get: <T>(key: string, fallback: T): T => {
        const data = localStorage.getItem(`gk_local_${key}`);
        return data ? JSON.parse(data) : fallback;
    },
    save: (key: string, data: any) => {
        localStorage.setItem(`gk_local_${key}`, JSON.stringify(data));
    },
    addItem: (key: string, item: any) => {
        const current = LocalDB.get<any[]>(key, []);
        LocalDB.save(key, [item, ...current]);
    }
};

/**
 * SILENT API CLIENT
 */
async function silentApiCall<T>(url: string, options: RequestInit = {}, fallback: T): Promise<T> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: { 
                'Content-Type': 'application/json',
                ...options.headers 
            },
        });
        clearTimeout(timeoutId);
        if (!response.ok) return fallback;
        return await response.json();
    } catch (error) {
        return fallback;
    }
}

// --- FILE UPLOAD ---
export const uploadFile = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append('file', file);

    try {
        const token = await auth.currentUser?.getIdToken();
        const response = await fetch(`${BACKEND_URL}/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) return null;
        const data = await response.json();
        // The path will be something like "/uploads/file-123.jpg"
        // Prepend BASE_URL if needed, but Nginx handles /uploads/
        return data.url; 
    } catch (e) {
        console.error("Upload failed", e);
        return null;
    }
};

// --- AUTHENTICATION ---
export const observeAuth = (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
            onSnapshot(doc(db, 'users', firebaseUser.uid), (snap) => {
                if (snap.exists()) callback(migrateUserData(snap.data()));
            });
        } else callback(null);
    });
};

export const login = async (email: string, pass: string) => signInWithEmailAndPassword(auth, email, pass);
export const logout = async () => signOut(auth);
export const register = async (user: User, pass: string) => {
    const cred = await createUserWithEmailAndPassword(auth, user.email!, pass);
    await setDoc(doc(db, 'users', cred.user.uid), { ...user, id: cred.user.uid });
    silentApiCall(`${BACKEND_URL}/auth/sync`, { method: 'POST', body: JSON.stringify({ ...user, id: cred.user.uid }) }, null);
};

const migrateUserData = (user: any): User => {
    if (!user) return { id: 'unknown', name: 'Deleted User', handle: '@deleted', avatarUrl: '' };
    return { ...user, friends: user.friends || [], friendRequests: user.friendRequests || [], friendRequestsSent: user.friendRequestsSent || [] };
};

// --- CORE DATA ---
export const getPosts = async (userId?: string, communityId?: string): Promise<Post[]> => {
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    if (communityId) params.append('communityId', communityId);
    const url = `${BACKEND_URL}/posts${params.toString() ? '?' + params.toString() : ''}`;
    
    const vpsPosts = await silentApiCall<Post[] | null>(url, {}, null);
    if (vpsPosts) return vpsPosts;

    let local = LocalDB.get<Post[]>('posts', []);
    if (userId) local = local.filter(p => p.user.id === userId);
    if (communityId) local = local.filter(p => p.communityId === communityId);
    return local;
};

export const createPost = async (post: Post) => {
    const success = await silentApiCall(`${BACKEND_URL}/posts`, { method: 'POST', body: JSON.stringify(post) }, false);
    if (!success) LocalDB.addItem('posts', post);
    return success;
};

export const getChats = async (userId: string): Promise<Chat[]> => {
    const vpsChats = await silentApiCall<Chat[] | null>(`${BACKEND_URL}/chats?userId=${userId}`, {}, null);
    if (vpsChats) return vpsChats.map(c => ({ ...c, lastMessageAt: c.lastMessageAt ? new Date(c.lastMessageAt) : undefined }));
    const local = LocalDB.get<Chat[]>('chats', []);
    return local.filter(c => c.participantIds.includes(userId));
};

export const createChat = async (type: 'direct' | 'group' | 'community' | 'ai', participantIds: string[], createdBy: string, name?: string): Promise<Chat> => {
    if (type === 'ai') {
        const chats = await getChats(createdBy);
        const existingAiChat = chats.find(c => c.type === 'ai' && c.participantIds.includes(AI_AGENT_ID));
        if (existingAiChat) return existingAiChat;
    }

    const id = `chat_${Date.now()}`;
    const newChat: Chat = {
        id,
        type,
        name,
        participantIds,
        messages: [],
        createdAt: new Date(),
        createdBy,
        lastMessageAt: new Date(),
        participantStatus: participantIds.reduce((acc, pid) => ({ ...acc, [pid]: 'inbox' as ChatFolder }), {}),
    };

    if (type === 'ai') {
        newChat.messages = [{
            id: 'm_welcome',
            senderId: AI_AGENT_ID,
            content: encryptMessage("Hello! I am your GK Assistant. How can I help you today?"),
            timestamp: new Date(),
            reactions: [],
            readBy: []
        }];
    }

    const success = await silentApiCall(`${BACKEND_URL}/chats`, { method: 'POST', body: JSON.stringify(newChat) }, false);
    
    if (!success) {
        const chats = LocalDB.get<Chat[]>('chats', []);
        LocalDB.save('chats', [newChat, ...chats]);
    }
    
    return newChat;
};

export const sendMessage = async (chatId: string, senderId: string, content: string) => {
    const success = await silentApiCall(`${BACKEND_URL}/messages`, { method: 'POST', body: JSON.stringify({ chatId, senderId, content: encryptMessage(content) }) }, false);
    if (!success) {
        const chats = LocalDB.get<Chat[]>('chats', []);
        const updated = chats.map(c => c.id === chatId ? { ...c, messages: [...(c.messages || []), { id: `m_${Date.now()}`, senderId, content: encryptMessage(content), timestamp: new Date(), reactions: [], readBy: [senderId] }], lastMessageAt: new Date() } : c);
        LocalDB.save('chats', updated);
    }
};

export const persistMessage = sendMessage;
export const encryptMessage = (content: string): string => btoa(unescape(encodeURIComponent(content)));
export const decryptMessage = (encoded: string): string => { try { return decodeURIComponent(escape(atob(encoded))); } catch (e) { return encoded || ''; } };

export const subscribeToNotifications = (userId: string, callback: (notifs: Notification[]) => void) => {
    const q = query(collection(db, 'notifications'), where('recipientId', '==', userId));
    return onSnapshot(q, (snap: any) => {
        const notifs = snap.docs.map((d: any) => {
            const data = d.data();
            return { ...data, id: d.id, createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt) };
        });
        notifs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        callback(notifs);
    });
};

export const initializeDB = async () => {
    try {
        const aiDoc = await getDoc(doc(db, 'users', AI_AGENT_ID));
        if (!aiDoc.exists()) {
            await setDoc(doc(db, 'users', AI_AGENT_ID), { id: AI_AGENT_ID, name: 'Assistant', handle: '@ai_assistant', avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=assistant', isOnline: true });
        }
    } catch (e) {}
};

export const getUserById = async (id: string) => { try { const d = await getDoc(doc(db, 'users', id)); return d.exists() ? migrateUserData(d.data()) : null; } catch (e) { return null; } };
export const getUsers = async (): Promise<User[]> => (await silentApiCall<User[] | null>(`${BACKEND_URL}/search/users`, {}, null)) || [];
export const subscribeToUser = (id: string, callback: (user: User | null) => void) => onSnapshot(doc(db, 'users', id), (snap) => callback(snap.exists() ? migrateUserData(snap.data()) : null));
export const updateUser = async (user: User) => { try { await updateDoc(doc(db, 'users', user.id), user as any); } catch (e) {} return user; };
export const toggleLike = async (p: string, u: string) => silentApiCall(`${BACKEND_URL}/posts/${p}/like`, { method: 'POST', body: JSON.stringify({ userId: u }) }, null);
export const addComment = async (p: string, c: Comment) => silentApiCall(`${BACKEND_URL}/posts/${p}/comments`, { method: 'POST', body: JSON.stringify({ content: c.content, userId: c.user.id }) }, null);
export const subscribeToUnreadNotifications = (u: string, cb: any) => onSnapshot(query(collection(db, 'notifications'), where('recipientId', '==', u), where('isRead', '==', false)), (s: any) => cb(s.size));
export const searchApp = async (q: string) => silentApiCall(`${BACKEND_URL}/search?q=${encodeURIComponent(q)}`, {}, { users: [], posts: [] });
export const globalSearch = searchApp;
export const deleteUserCompletely = async (u: string) => { const user = auth.currentUser; if (user && user.uid === u) { await deleteDoc(doc(db, 'users', u)); await deleteUser(user); } };
export const markNotificationAsRead = async (id: string) => updateDoc(doc(db, 'notifications', id), { isRead: true });
export const deleteNotification = async (id: string) => deleteDoc(doc(db, 'notifications', id));
export const deleteAllNotifications = async (u: string) => { const snap = await getDocs(query(collection(db, 'notifications'), where('recipientId', '==', u))); const batch = writeBatch(db); snap.docs.forEach(d => batch.delete(d.ref)); await batch.commit(); };
export const getDiscoveryFeed = async () => getPosts();
export const getTrendingTags = async () => [];
export const subscribeToPostsLocal = () => () => {};
export const subscribeToUnreadMessageCount = (u: string, cb: any) => { cb(0); return () => {}; };
export const hasActiveGuestSession = async () => false;
export const purgeChatHistory = async (u: string) => { LocalDB.save('chats', LocalDB.get<Chat[]>('chats', []).filter(c => !c.participantIds.includes(u))); silentApiCall(`${BACKEND_URL}/chats/purge`, { method: 'POST', body: JSON.stringify({ userId: u }) }, null); };
export const subscribeToChatMessages = (chatId: string, callback: (msgs: Message[]) => void) => { const interval = setInterval(() => { const chats = LocalDB.get<Chat[]>('chats', []); const current = chats.find(c => c.id === chatId); if (current) callback(current.messages || []); }, 1000); return () => clearInterval(interval); };
export const subscribeToChat = (chatId: string, callback: (chat: Chat | null) => void) => { const interval = setInterval(() => { const chats = LocalDB.get<Chat[]>('chats', []); callback(chats.find(c => c.id === chatId) || null); }, 1000); return () => clearInterval(interval); };
export const getArchivedPosts = async (u: string) => [];
export const archivePost = async (p: string, a: boolean) => {};
export const updatePost = async (p: string, u: any) => {};
export const deletePost = async (p: string) => {};
export const removeMention = async (p: string, u: string) => {};
export const deleteComment = async (p: string, c: string) => {};
export const sendFriendRequest = async (u: string, t: string) => {};
export const cancelFriendRequest = async (u: string, t: string) => {};
export const acceptFriendRequest = async (u: string, t: string) => {};
export const declineFriendRequest = async (u: string, t: string) => {};
export const removeFriend = async (u: string, t: string) => {};
export const getCommunities = async () => [];
export const createCommunity = async (n: string, d: string, p: string, c: string) => ({} as any);
export const getCommunity = async (id: string) => null;
export const updateCommunity = async (id: string, u: any) => {};
export const deleteCommunity = async (id: string) => {};
export const joinCommunity = async (c: string, u: string) => {};
export const leaveCommunity = async (c: string, u: string) => {};
export const updateCommunityMemberRole = async (c: string, u: string, r: any) => {};
export const sendSignal = async (p: any) => {};
export const subscribeToSignals = (id: string, cb: any) => () => {};
