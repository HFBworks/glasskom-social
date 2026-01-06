
import React, { useState, useEffect, useRef } from 'react';
import { User, CallType, CallStatus, SignalingPayload } from '../types';
import * as storageService from '../services/storageService';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Maximize2, Minimize2, ShieldCheck } from 'lucide-react';
import Avatar from './Avatar';

interface CallOverlayProps {
    currentUser: User;
    activeCall: {
        chatId: string;
        otherUser: User;
        type: CallType;
        status: CallStatus;
        isCaller: boolean;
    } | null;
    onEndCall: () => void;
}

const CallOverlay: React.FC<CallOverlayProps> = ({ currentUser, activeCall, onEndCall }) => {
    const [status, setStatus] = useState<CallStatus>('idle');
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const signalsProcessed = useRef<Set<string>>(new Set());

    const iceServers = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ]
    };

    const cleanup = () => {
        if (localStream) {
            localStream.getTracks().forEach((track) => track.stop());
        }
        if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
        }
        setLocalStream(null);
        setRemoteStream(null);
        setStatus('idle');
        signalsProcessed.current.clear();
    };

    const initPeerConnection = () => {
        if (pcRef.current) return pcRef.current;

        const pc = new RTCPeerConnection(iceServers);
        pcRef.current = pc;

        pc.onicecandidate = (event) => {
            if (event.candidate && activeCall) {
                storageService.sendSignal({
                    type: 'candidate',
                    callerId: currentUser.id,
                    receiverId: activeCall.otherUser.id,
                    chatId: activeCall.chatId,
                    candidate: event.candidate,
                    callType: activeCall.type
                });
            }
        };

        pc.ontrack = (event) => {
            setRemoteStream(event.streams[0]);
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = event.streams[0];
            }
        };

        pc.oniceconnectionstatechange = () => {
            if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') {
                onEndCall();
            }
        };

        return pc;
    };

    const startCall = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: activeCall?.type === 'video'
            });
            setLocalStream(stream);
            if (localVideoRef.current) localVideoRef.current.srcObject = stream;

            const pc = initPeerConnection();
            stream.getTracks().forEach((track) => pc.addTrack(track, stream));

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            storageService.sendSignal({
                type: 'offer',
                callerId: currentUser.id,
                receiverId: activeCall?.otherUser.id || '',
                chatId: activeCall?.chatId || '',
                sdp: offer,
                callType: activeCall?.type || 'voice'
            });
        } catch (err) {
            console.error("Failed to start call:", err);
            onEndCall();
        }
    };

    const acceptCall = async () => {
        if (!activeCall) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: activeCall.type === 'video'
            });
            setLocalStream(stream);
            if (localVideoRef.current) localVideoRef.current.srcObject = stream;

            const pc = initPeerConnection();
            stream.getTracks().forEach((track) => pc.addTrack(track, stream));

            // Remote description should have been set during 'offer' signal processing
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            storageService.sendSignal({
                type: 'answer',
                callerId: currentUser.id,
                receiverId: activeCall.otherUser.id,
                chatId: activeCall.chatId,
                sdp: answer,
                callType: activeCall.type
            });
            setStatus('connected');
        } catch (err) {
            console.error("Accept call failed:", err);
            onEndCall();
        }
    };

    const handleSignal = async (payload: SignalingPayload) => {
        // Simple deduplication for Firestore signals
        const sigId = `${payload.type}_${payload.callerId}_${activeCall?.chatId}`;
        if (signalsProcessed.current.has(sigId)) return;
        
        if (!activeCall || payload.chatId !== activeCall.chatId) return;

        try {
            if (payload.type === 'offer' && !activeCall.isCaller) {
                const pc = initPeerConnection();
                if (payload.sdp) {
                    await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
                    setStatus('incoming');
                    signalsProcessed.current.add(sigId);
                }
            } else if (payload.type === 'answer' && activeCall.isCaller) {
                if (pcRef.current && payload.sdp) {
                    await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
                    setStatus('connected');
                    signalsProcessed.current.add(sigId);
                }
            } else if (payload.type === 'candidate') {
                if (pcRef.current && payload.candidate) {
                    await pcRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
                }
            } else if (payload.type === 'hangup') {
                onEndCall();
            }
        } catch (e) {
            console.error("Signaling error:", e);
        }
    };

    useEffect(() => {
        if (!activeCall) {
            cleanup();
            return;
        }

        setStatus(activeCall.status);
        if (activeCall.isCaller) {
            startCall();
        }

        const unsubscribe = storageService.subscribeToSignals(currentUser.id, handleSignal);
        return () => {
            unsubscribe();
            cleanup();
        };
    }, [activeCall?.chatId]);

    const handleHangup = () => {
        if (activeCall) {
            storageService.sendSignal({
                type: 'hangup',
                callerId: currentUser.id,
                receiverId: activeCall.otherUser.id,
                chatId: activeCall.chatId,
                callType: activeCall.type
            });
        }
        onEndCall();
    };

    const toggleMute = () => {
        if (localStream) {
            localStream.getAudioTracks().forEach((t) => t.enabled = !t.enabled);
            setIsMuted(!isMuted);
        }
    };

    const toggleVideo = () => {
        if (localStream) {
            localStream.getVideoTracks().forEach((t) => t.enabled = !t.enabled);
            setIsVideoOff(!isVideoOff);
        }
    };

    if (!activeCall) return null;

    if (isMinimized) {
        return (
            <div className="fixed bottom-24 right-6 z-[1000] aero-card p-3 rounded-2xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-right-10 border border-primary-500/30 bg-charcoal-900/90 backdrop-blur-2xl">
                <Avatar src={activeCall.otherUser.avatarUrl} alt="" size="sm" />
                <div className="flex-1">
                    <p className="text-xs font-bold text-white truncate w-24">{activeCall.otherUser.name}</p>
                    <p className="text-[10px] text-primary-400 capitalize">{status}</p>
                </div>
                <button onClick={() => setIsMinimized(false)} className="p-2 text-gray-400 hover:text-white transition-colors">
                    <Maximize2 size={16} />
                </button>
                <button onClick={handleHangup} className="p-2.5 bg-red-500 text-white rounded-full shadow-lg shadow-red-500/20 active:scale-90 transition-all">
                    <PhoneOff size={16} />
                </button>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-500">
            <div className="aero-card w-full max-w-4xl rounded-[2.5rem] overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.5)] border border-white/10 flex flex-col h-[85vh]">
                
                {/* Header */}
                <div className="p-5 flex justify-between items-center bg-white/5 border-b border-white/5 backdrop-blur-xl relative z-30">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-primary-500/20 flex items-center justify-center text-primary-400 border border-primary-500/20">
                            {activeCall.type === 'video' ? <Video size={20} /> : <Phone size={20} />}
                        </div>
                        <div>
                            <span className="text-sm font-black text-white uppercase tracking-widest">
                                {activeCall.type === 'video' ? 'Video Hub' : 'Voice Link'}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                <span className="text-[10px] text-primary-400 font-bold uppercase tracking-tighter capitalize">{status}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/10">
                            <ShieldCheck size={14} className="text-green-400" />
                            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">End-to-End Encrypted</span>
                        </div>
                        <button onClick={() => setIsMinimized(true)} className="p-2.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                            <Minimize2 size={20} />
                        </button>
                    </div>
                </div>

                {/* Media Content */}
                <div className="flex-1 relative bg-charcoal-900 overflow-hidden flex items-center justify-center">
                    {/* Remote Stream View */}
                    {status === 'connected' && remoteStream ? (
                        activeCall.type === 'video' ? (
                            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                        ) : (
                            <div className="flex flex-col items-center gap-10 animate-in zoom-in duration-700">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-primary-500/20 blur-[60px] rounded-full animate-pulse"></div>
                                    <Avatar src={activeCall.otherUser.avatarUrl} alt="" size="xl" />
                                </div>
                                <div className="text-center space-y-2">
                                    <h3 className="text-4xl font-black text-white tracking-tighter">{activeCall.otherUser.name}</h3>
                                    <p className="text-primary-400 font-mono text-sm tracking-[0.3em] uppercase">Voice Stream Active</p>
                                </div>
                            </div>
                        )
                    ) : (
                        <div className="flex flex-col items-center gap-12 text-center">
                            <div className="relative">
                                <div className="absolute inset-[-20px] border border-primary-500/30 rounded-full animate-ping opacity-30"></div>
                                <div className="absolute inset-[-40px] border border-primary-500/10 rounded-full animate-ping opacity-10 [animation-delay:0.5s]"></div>
                                <Avatar src={activeCall.otherUser.avatarUrl} alt="" size="xl" />
                            </div>
                            <div className="space-y-4">
                                <h3 className="text-3xl font-black text-white tracking-tighter">{activeCall.otherUser.name}</h3>
                                <p className="text-gray-400 font-bold uppercase tracking-[0.4em] text-[11px] animate-pulse">
                                    {status === 'incoming' ? 'Incoming encrypted call...' : 'Establishing secure link...'}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Local Stream PIP */}
                    {(status === 'connected' || status === 'calling') && activeCall.type === 'video' && (
                        <div className="absolute bottom-8 right-8 w-40 md:w-64 aspect-video bg-charcoal-800 rounded-3xl overflow-hidden border-2 border-primary-500 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-20 group">
                            <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                            {isVideoOff && (
                                <div className="absolute inset-0 bg-charcoal-900/90 backdrop-blur-md flex flex-col items-center justify-center gap-2">
                                    <VideoOff size={32} className="text-gray-600" />
                                    <span className="text-[10px] text-gray-500 font-bold uppercase">Camera Off</span>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                                <span className="text-[10px] text-white font-bold uppercase tracking-widest">You</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Controls */}
                <div className="p-10 bg-charcoal-800/60 backdrop-blur-[40px] flex justify-center items-center gap-8 md:gap-12 border-t border-white/5 relative z-30">
                    {status === 'incoming' ? (
                        <div className="flex gap-16 animate-in slide-in-from-bottom-10 duration-500">
                            <button 
                                onClick={handleHangup} 
                                className="w-20 h-20 flex flex-col items-center justify-center bg-red-500 text-white rounded-full shadow-[0_15px_30px_rgba(239,68,68,0.3)] hover:scale-110 active:scale-95 transition-all group"
                            >
                                <PhoneOff size={32} className="group-hover:rotate-12 transition-transform" />
                            </button>
                            <button 
                                onClick={acceptCall} 
                                className="w-24 h-24 flex flex-col items-center justify-center bg-gradient-success text-white rounded-full shadow-[0_20px_40px_rgba(52,211,153,0.3)] hover:scale-110 active:scale-95 transition-all group"
                            >
                                <Phone size={40} className="group-hover:-rotate-12 transition-transform" />
                            </button>
                        </div>
                    ) : (
                        <>
                            <button 
                                onClick={toggleMute} 
                                className={`w-16 h-16 flex items-center justify-center rounded-2xl border transition-all ${isMuted ? 'bg-red-500/20 border-red-500/30 text-red-400' : 'bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20'}`}
                                title={isMuted ? "Unmute" : "Mute"}
                            >
                                {isMuted ? <MicOff size={28} /> : <Mic size={28} />}
                            </button>
                            
                            {activeCall.type === 'video' && (
                                <button 
                                    onClick={toggleVideo} 
                                    className={`w-16 h-16 flex items-center justify-center rounded-2xl border transition-all ${isVideoOff ? 'bg-red-500/20 border-red-500/30 text-red-400' : 'bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20'}`}
                                    title={isVideoOff ? "Start Video" : "Stop Video"}
                                >
                                    {isVideoOff ? <VideoOff size={28} /> : <Video size={28} />}
                                </button>
                            )}

                            <div className="h-10 w-px bg-white/10 mx-2"></div>

                            <button 
                                onClick={handleHangup} 
                                className="w-20 h-20 flex items-center justify-center bg-red-600 text-white rounded-full shadow-[0_15px_40px_rgba(220,38,38,0.4)] hover:scale-110 active:scale-90 transition-all border-4 border-white/10 group"
                                title="End Call"
                            >
                                <PhoneOff size={32} className="group-hover:rotate-12 transition-transform" />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Privacy Disclaimer */}
            <div className="absolute top-10 left-1/2 -translate-x-1/2 flex items-center gap-3 text-white/40 text-[10px] font-black uppercase tracking-[0.3em] pointer-events-none">
                <ShieldCheck size={14} />
                Secure P2P Channel Active
            </div>
        </div>
    );
};

export default CallOverlay;
