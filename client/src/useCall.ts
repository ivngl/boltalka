import { useState, useEffect, useRef, useCallback } from "react";
import type { Socket } from "socket.io-client";
import { getSocket } from "./socket.ts";

function log(...args: unknown[]) {
  console.log("[Boltalka]", ...args);
}

let cachedTurn: { url: string; username: string; credential: string } | null | undefined;
let cachedTurnExpiry = 0;
let turnFetchCount = 0;

async function turnConfig(): Promise<{ url: string; username: string; credential: string } | null> {
  if (cachedTurn !== undefined && Date.now() < cachedTurnExpiry) return cachedTurn;
  const token = localStorage.getItem("token");
  if (!token) return (cachedTurn = null);
  try {
    log(`turnConfig: fetching (attempt ${++turnFetchCount})`);
    const res = await fetch("/api/turn-config", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      log("turnConfig: not ok", res.status);
      return (cachedTurn = null);
    }
    const data = await res.json();
    if (!data) {
      log("turnConfig: empty response");
      return (cachedTurn = null);
    }
    log("turnConfig: got config", data);
    cachedTurn = data;
    cachedTurnExpiry = Date.now() + 23 * 60 * 60 * 1000;
    return data;
  } catch (err) {
    log("turnConfig: fetch error", err);
    return (cachedTurn = null);
  }
}

async function pcConfig(): Promise<RTCConfiguration> {
  const turn = await turnConfig();
  const config: RTCConfiguration = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      ...(turn ? [{ urls: turn.url, username: turn.username, credential: turn.credential }] : []),
    ],
  };
  log("pcConfig:", JSON.stringify(config));
  return config;
}

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
  attachSocket: (socket: Socket) => void;
}

export function useCall(userId?: string | null): UseCallReturn {
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
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const disconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peerIdRef = useRef<string | null>(null);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const callTypeRef = useRef<CallType>("video");
  const pcIdRef = useRef(0);
  const callHandlersAttachedRef = useRef<Socket | null>(null);
  const userIdRef = useRef(userId ?? null);
  const acceptingRef = useRef(false);
  const callAcceptedInProgressRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    userIdRef.current = userId ?? null;
  }, [userId]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  function setStateIfMounted<T>(setter: React.Dispatch<React.SetStateAction<T>>, value: T) {
    if (mountedRef.current) setter(value);
  }

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

  function cancelDisconnectTimer() {
    if (disconnectTimerRef.current) {
      clearTimeout(disconnectTimerRef.current);
      disconnectTimerRef.current = null;
    }
  }

  const cleanup = useCallback(() => {
    cancelDisconnectTimer();
    stopTimer();
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    pendingIceRef.current = [];
    pendingOfferRef.current = null;
    peerIdRef.current = null;
    callTypeRef.current = "video";
    setStateIfMounted(setLocalStream, null);
    setStateIfMounted(setRemoteStream, null);
    setStateIfMounted(setCallDuration, 0);
    setStateIfMounted(setCallType, "video");
    setStateIfMounted(setIsAudioMuted, false);
    setStateIfMounted(setIsVideoEnabled, true);
    setStateIfMounted(setPeerId, null);
  }, []);

  const endCall = useCallback(() => {
    log("endCall triggered, peerId:", peerIdRef.current);
    if (peerIdRef.current) {
      getSocket()?.emit("end_call", { targetId: peerIdRef.current });
    }
    setStateIfMounted(setCallState, "ended");
  }, []);

  function flushPendingIce(pc: RTCPeerConnection) {
    if (pendingIceRef.current.length > 0) {
      log(`flushPendingIce: flushing ${pendingIceRef.current.length} queued candidates`);
      for (const c of pendingIceRef.current) {
        pc.addIceCandidate(new RTCIceCandidate(c)).catch((err) => {
          log("flushPendingIce: addIceCandidate failed", err);
        });
      }
      pendingIceRef.current = [];
    }
  }

  async function ensurePC(role?: string) {
    if (pcRef.current) {
      log(`ensurePC(${role}): reusing existing PC`);
      return pcRef.current;
    }
    const id = ++pcIdRef.current;
    log(`ensurePC(${role}): creating PC #${id}`);

    const constraints: MediaStreamConstraints = { audio: true };
    if (callTypeRef.current === "video") {
      constraints.video = true;
    }
    log(`ensurePC(${role}): getUserMedia constraints:`, constraints);
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    log(`ensurePC(${role}): got tracks:`, stream.getTracks().map(t => `${t.kind}:${t.label}:${t.enabled}`));
    localStreamRef.current = stream;
    setStateIfMounted(setLocalStream, stream);

    console.debug("useCall.ensurePC: creating RTCPeerConnection");
    const pc = new RTCPeerConnection(await pcConfig());
    pcRef.current = pc;

    stream.getTracks().forEach((track) => {
      console.debug("useCall.ensurePC: adding local track", track.kind);
      pc.addTrack(track, stream);
    });
    log(`ensurePC(${role}): added ${stream.getTracks().length} tracks to PC #${id}`);

    registerHandlers(pc, role);
    await processPendingOffer(pc, role);

    flushPendingIce(pc);

    log(`ensurePC(${role}): PC #${id} ready`);
    return pc;
  }

  function registerHandlers(pc: RTCPeerConnection, role?: string) {
    let candidateCount = 0;
    pc.onicecandidate = (e) => {
      if (e.candidate && peerIdRef.current) {
        candidateCount++;
        log(`ensurePC(${role}): ICE candidate #${candidateCount} generated`, e.candidate.type, e.candidate.address, e.candidate.port, e.candidate.protocol);
        getSocket()?.emit("ice_candidate", {
          targetId: peerIdRef.current,
          candidate: e.candidate.toJSON(),
        });
      } else {
        log(`ensurePC(${role}): ICE gathering complete — ${candidateCount} candidates total`);
      }
    };

    pc.ontrack = (e) => {
      log(`ensurePC(${role}): ontrack kind:${e.track.kind} streams:${e.streams.length} readyState:${e.track.readyState} muted:${e.track.muted}`);
      const remote = e.streams[0];
      if (remote) {
        log(`ensurePC(${role}): ontrack — using stream`, remote.id, remote.getTracks().length);
        remoteStreamRef.current = remote;
        setStateIfMounted(setRemoteStream, remote);
      } else if (e.track) {
        log(`ensurePC(${role}): ontrack — no stream, creating fallback`);
        const fallback = new MediaStream([e.track]);
        remoteStreamRef.current = fallback;
        setStateIfMounted(setRemoteStream, fallback);
      }
    };

    pc.onconnectionstatechange = () => {
      log(`ensurePC(${role}): connection state:`, pc.connectionState);
      if (pc.connectionState === "connected") {
        cancelDisconnectTimer();
        setStateIfMounted(setCallState, "connected");
        startTimer();
      } else if (pc.connectionState === "failed") {
        endCall();
      } else if (pc.connectionState === "disconnected") {
        if (!disconnectTimerRef.current) {
          log(`ensurePC(${role}): disconnected — starting 5s grace timer`);
          disconnectTimerRef.current = setTimeout(() => {
            log(`ensurePC(${role}): grace timer expired, ending call`);
            endCall();
          }, 5000);
        }
      }
    };

    pc.oniceconnectionstatechange = () => {
      log(`ensurePC(${role}): ICE connection state:`, pc.iceConnectionState);
      if (pc.iceConnectionState === "failed") {
        endCall();
      } else if (pc.iceConnectionState === "disconnected") {
        if (!disconnectTimerRef.current) {
          log(`ensurePC(${role}): ICE disconnected — starting 5s grace timer`);
          disconnectTimerRef.current = setTimeout(() => {
            log(`ensurePC(${role}): ICE grace timer expired, ending call`);
            endCall();
          }, 5000);
        }
      } else if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
        cancelDisconnectTimer();
      }
    };

    pc.onicegatheringstatechange = () => {
      log(`ensurePC(${role}): ICE gathering state:`, pc.iceGatheringState);
    };

    pc.onsignalingstatechange = () => {
      log(`ensurePC(${role}): signaling state:`, pc.signalingState);
    };
  }

  async function processPendingOffer(pc: RTCPeerConnection, role?: string) {
    if (!pendingOfferRef.current) return;
    log(`ensurePC(${role}): processing pending offer hasAudio:${pendingOfferRef.current.sdp?.includes("m=audio")} hasVideo:${pendingOfferRef.current.sdp?.includes("m=video")}`);
    await pc.setRemoteDescription(
      new RTCSessionDescription(pendingOfferRef.current),
    );
    pendingOfferRef.current = null;
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    log(`ensurePC(${role}): sent answer`);
    getSocket()?.emit("answer", {
      targetId: peerIdRef.current,
      sdp: pc.localDescription,
    });
  }

  function attachSocket(socket: Socket) {
    if (callHandlersAttachedRef.current === socket) {
      log("attachSocket: already attached to this socket");
      return;
    }
    callHandlersAttachedRef.current = socket;
    log("attachSocket: registering call handlers");

    const onCallAccepted = async () => {
      if (callAcceptedInProgressRef.current) return;
      callAcceptedInProgressRef.current = true;
      log("onCallAccepted: received");
      setStateIfMounted(setCallState, "connecting");
      try {
        const pc = await ensurePC("caller");
        if (!pc) return;
        log("onCallAccepted: creating offer");
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        log("onCallAccepted: offer sent, type:", offer.type);
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
      log("onCallRejected");
      setStateIfMounted(setCallState, "ended");
    };

    const onCallFailed = () => {
      log("onCallFailed");
      setStateIfMounted(setCallState, "ended");
    };

    const onOffer = async ({ sdp, from }: { sdp: RTCSessionDescriptionInit; from: string }) => {
      log("onOffer: received, from:", from, "pcRef.current =", !!pcRef.current, "type:", sdp.type, "hasAudio:", sdp.sdp?.includes("m=audio"), "hasVideo:", sdp.sdp?.includes("m=video"));
      try {
        const pc = pcRef.current;
        if (pc) {
          // Glare resolution: both sides called simultaneously.
          // The user with the lower ID backs off (polite) and processes the remote offer.
          if (pc.signalingState === "have-local-offer" && from === peerIdRef.current) {
            const myId = userIdRef.current;
            if (myId && myId < from) {
              log("onOffer: glare — our ID is lower, rolling back");
              await pc.setLocalDescription({ type: "rollback" });
            } else if (myId && myId > from) {
              log("onOffer: glare — our ID is higher, our offer wins, ignoring");
              return;
            }
          }
          log("onOffer: setting remote description");
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          log("onOffer: creating answer");
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          log("onOffer: answer sent");
          getSocket()?.emit("answer", {
            targetId: peerIdRef.current,
            sdp: pc.localDescription,
          });
        } else {
          log("onOffer: storing as pending offer");
          pendingOfferRef.current = sdp;
        }
      } catch (err) {
        console.error("onOffer failed:", err);
        endCall();
      }
    };

    const onAnswer = async ({ sdp }: { sdp: RTCSessionDescriptionInit }) => {
      console.debug("useCall.onAnswer: received answer", sdp.type);
      const pc = pcRef.current;
      log("onAnswer: received, pc exists =", !!pc, "currentRemoteDescription =", !!pc?.currentRemoteDescription);
      if (pc && !pc.currentRemoteDescription) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          flushPendingIce(pc);
          log("onAnswer: remote description set");
        } catch (err) {
          console.error("onAnswer failed:", err);
          endCall();
        }
      }
    };

    const onIceCandidate = async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      console.debug("useCall.onIceCandidate: received candidate", candidate);
      if (!candidate) return;

      const pc = pcRef.current;
      if (!pc) {
        pendingIceRef.current.push(candidate);
        log("onIceCandidate: queued (no PC yet)");
        return;
      }
      if (!pc.currentRemoteDescription) {
        pendingIceRef.current.push(candidate);
        log("onIceCandidate: queued (no remote description)");
        return;
      }
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
        log("onIceCandidate: added", candidate.type || "unknown", candidate.address || "no-address");
      } catch (err) {
        log("onIceCandidate: addIceCandidate failed", err);
      }
    };

    const onCallEnded = () => {
      log("onCallEnded: remote ended call");
      setStateIfMounted(setCallState, "ended");
    };

    socket.on("call_accepted", onCallAccepted);
    socket.on("call_rejected", onCallRejected);
    socket.on("call_failed", onCallFailed);
    socket.on("offer", onOffer);
    socket.on("answer", onAnswer);
    socket.on("ice_candidate", onIceCandidate);
    socket.on("call_ended", onCallEnded);
  }

  // Full cleanup on unmount
  useEffect(() => {
    return () => {
      cancelDisconnectTimer();
      stopTimer();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (pcRef.current) {
        pcRef.current.close();
      }
    };
  }, []);

  // Show "ended" for 2 seconds, then clean up
  useEffect(() => {
    if (callState !== "ended") return;
    const t = setTimeout(() => {
      cleanup();
      setStateIfMounted(setCallState, "idle");
    }, 2000);
    return () => clearTimeout(t);
  }, [callState, cleanup]);

  const startCall = useCallback(
    async (calleeId: string, conversationId: string, type: CallType = "video") => {
      if (callState !== "idle") return;
      log("startCall: calling", calleeId, "type:", type);
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
    if (!incomingCall || acceptingRef.current) return;
    acceptingRef.current = true;
    const callerId = incomingCall.callerId;
    log("acceptCall: accepting from", callerId, "type:", incomingCall.callType);
    peerIdRef.current = callerId;
    setPeerId(callerId);
    setIncomingCall(null);
    setCallState("connecting");
    setCallType(incomingCall.callType);
    callTypeRef.current = incomingCall.callType;
    setIsAudioMuted(false);
    setIsVideoEnabled(incomingCall.callType === "video");

    getSocket()?.emit("accept_call", { callerId });
    log("acceptCall: emitted accept_call");

    try {
      await ensurePC("callee");
    } catch (err) {
      console.error("ensurePC in acceptCall failed:", err);
      endCall();
    }
    acceptingRef.current = false;
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
    attachSocket,
  };
}
