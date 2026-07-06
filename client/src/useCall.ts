import { useState, useEffect, useRef, useCallback } from "react";
import { getSocket } from "./socket.ts";

const PC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export type CallState = "idle" | "calling" | "ringing" | "connecting" | "connected" | "ended";
export type CallType = "audio" | "video";

export interface IncomingCallInfo {
  callerId: string;
  conversationId: string;
  callType: CallType;
}

export interface UseCallReturn {
  callState: CallState;
  callType: CallType;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  callDuration: number;
  isAudioMuted: boolean;
  isVideoEnabled: boolean;
  incomingCall: IncomingCallInfo | null;
  peerId: string | null;
  startCall: (calleeId: string, conversationId: string, type?: CallType) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;
  toggleAudio: () => void;
  toggleVideo: () => void;
  setIncomingCall: (call: IncomingCallInfo | null) => void;
}

export function useCall(): UseCallReturn {
  const [callState, setCallState] = useState<CallState>("idle");
  const [callType, setCallType] = useState<CallType>("video");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [incomingCall, setIncomingCall] = useState<IncomingCallInfo | null>(null);
  const [peerId, setPeerId] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const peerIdRef = useRef<string | null>(null);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const callTypeRef = useRef<CallType>("video");

  function stopTimer() {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
  }

  function startTimer() {
    setCallDuration(0);
    stopTimer();
    callTimerRef.current = setInterval(() => {
      setCallDuration((d) => d + 1);
    }, 1000);
  }

  const cleanup = useCallback(() => {
    stopTimer();
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setCallDuration(0);
    setCallState("idle");
    setCallType("video");
    setIsAudioMuted(false);
    setIsVideoEnabled(true);
    setPeerId(null);
    peerIdRef.current = null;
    pendingOfferRef.current = null;
    callTypeRef.current = "video";
  }, []);

  const endCall = useCallback(() => {
    if (peerIdRef.current) {
      getSocket()?.emit("end_call", { targetId: peerIdRef.current });
    }
    setCallState("ended");
    cleanup();
    setTimeout(() => setCallState("idle"), 2000);
  }, [cleanup]);

  async function ensurePC() {
    if (pcRef.current) return pcRef.current;

    const constraints: MediaStreamConstraints = { audio: true };
    if (callTypeRef.current === "video") {
      constraints.video = true;
    }
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    localStreamRef.current = stream;
    setLocalStream(stream);

    const pc = new RTCPeerConnection(PC_CONFIG);
    pcRef.current = pc;

    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    pc.onicecandidate = (e) => {
      if (e.candidate && peerIdRef.current) {
        getSocket()?.emit("ice_candidate", {
          targetId: peerIdRef.current,
          candidate: e.candidate.toJSON(),
        });
      }
    };

    pc.ontrack = (e) => {
      if (e.streams[0]) {
        setRemoteStream(e.streams[0]);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        setCallState("connected");
        startTimer();
      } else if (pc.connectionState === "failed") {
        endCall();
      } else if (pc.connectionState === "disconnected") {
        endCall();
      }
    };

    if (pendingOfferRef.current) {
      await pc.setRemoteDescription(
        new RTCSessionDescription(pendingOfferRef.current),
      );
      pendingOfferRef.current = null;
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      getSocket()?.emit("answer", {
        targetId: peerIdRef.current,
        sdp: pc.localDescription,
      });
    }

    return pc;
  }

  // Socket event handlers — set up once
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onCallAccepted = async () => {
      setCallState("connecting");
      try {
        const pc = await ensurePC();
        if (!pc) return;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        getSocket()?.emit("offer", {
          targetId: peerIdRef.current,
          sdp: pc.localDescription,
        });
      } catch (err) {
        console.error("ensurePC in onCallAccepted failed:", err);
        endCall();
      }
    };

    const onCallRejected = () => {
      setCallState("ended");
    };

    const onCallFailed = () => {
      setCallState("ended");
    };

    const onOffer = async ({ sdp }: { sdp: RTCSessionDescriptionInit }) => {
      try {
        const pc = pcRef.current;
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          getSocket()?.emit("answer", {
            targetId: peerIdRef.current,
            sdp: pc.localDescription,
          });
        } else {
          pendingOfferRef.current = sdp;
        }
      } catch {
        endCall();
      }
    };

    const onAnswer = async ({ sdp }: { sdp: RTCSessionDescriptionInit }) => {
      const pc = pcRef.current;
      if (pc && !pc.currentRemoteDescription) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        } catch {
          endCall();
        }
      }
    };

    const onIceCandidate = async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      const pc = pcRef.current;
      if (pc && candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch { /* ignore */ }
      }
    };

    const onCallEnded = () => {
      setCallState("ended");
    };

    socket.on("call_accepted", onCallAccepted);
    socket.on("call_rejected", onCallRejected);
    socket.on("call_failed", onCallFailed);
    socket.on("offer", onOffer);
    socket.on("answer", onAnswer);
    socket.on("ice_candidate", onIceCandidate);
    socket.on("call_ended", onCallEnded);

    return () => {
      socket.off("call_accepted", onCallAccepted);
      socket.off("call_rejected", onCallRejected);
      socket.off("call_failed", onCallFailed);
      socket.off("offer", onOffer);
      socket.off("answer", onAnswer);
      socket.off("ice_candidate", onIceCandidate);
      socket.off("call_ended", onCallEnded);
    };
    // endCall is stable via useCallback, ensurePC uses refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Full cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimer();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (pcRef.current) {
        pcRef.current.close();
      }
    };
  }, []);

  // Clean up callState after showing "ended" state briefly
  useEffect(() => {
    if (callState === "ended") {
      cleanup();
      const t = setTimeout(() => setCallState("idle"), 2000);
      return () => clearTimeout(t);
    }
  }, [callState, cleanup]);

  const startCall = useCallback(
    async (calleeId: string, conversationId: string, type: CallType = "video") => {
      if (callState !== "idle") return;
      peerIdRef.current = calleeId;
      setPeerId(calleeId);
      setCallState("calling");
      setCallType(type);
      callTypeRef.current = type;
      setIsAudioMuted(false);
      setIsVideoEnabled(type === "video");
      getSocket()?.emit("call_user", { calleeId, conversationId, callType: type });
    },
    [callState],
  );

  const acceptCall = useCallback(async () => {
    if (!incomingCall) return;
    const callerId = incomingCall.callerId;
    peerIdRef.current = callerId;
    setPeerId(callerId);
    setIncomingCall(null);
    setCallState("connecting");
    setCallType(incomingCall.callType);
    callTypeRef.current = incomingCall.callType;
    setIsAudioMuted(false);
    setIsVideoEnabled(incomingCall.callType === "video");

    getSocket()?.emit("accept_call", { callerId });

    try {
      await ensurePC();
    } catch (err) {
      console.error("ensurePC in acceptCall failed:", err);
      endCall();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingCall]);

  const rejectCall = useCallback(() => {
    if (!incomingCall) return;
    getSocket()?.emit("reject_call", { callerId: incomingCall.callerId });
    setIncomingCall(null);
  }, [incomingCall]);

  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const at = localStreamRef.current.getAudioTracks()[0];
      if (at) {
        at.enabled = !at.enabled;
        setIsAudioMuted(!at.enabled);
        if (peerIdRef.current) {
          getSocket()?.emit("toggle_audio", {
            targetId: peerIdRef.current,
            muted: !at.enabled,
          });
        }
      }
    }
  }, []);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const vt = localStreamRef.current.getVideoTracks()[0];
      if (vt) {
        vt.enabled = !vt.enabled;
        setIsVideoEnabled(vt.enabled);
        if (peerIdRef.current) {
          getSocket()?.emit("toggle_video", {
            targetId: peerIdRef.current,
            enabled: vt.enabled,
          });
        }
      }
    }
  }, []);

  return {
    callState,
    callType,
    localStream,
    remoteStream,
    callDuration,
    isAudioMuted,
    isVideoEnabled,
    incomingCall,
    peerId,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleAudio,
    toggleVideo,
    setIncomingCall,
  };
}
