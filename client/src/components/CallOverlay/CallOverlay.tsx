import { useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { CallState, CallType } from "../../useCall.ts";
import "./CallOverlay.css";

interface CallOverlayProps {
  callState: CallState;
  callType: CallType;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  peerName: string;
  callDuration: number;
  isAudioMuted: boolean;
  isVideoEnabled: boolean;
  onEndCall: () => void;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
}

export default function CallOverlay({
  callState,
  callType,
  localStream,
  remoteStream,
  peerName,
  callDuration,
  isAudioMuted,
  isVideoEnabled,
  onEndCall,
  onToggleAudio,
  onToggleVideo,
}: CallOverlayProps) {
  const isAudio = callType === "audio";
  const { t } = useTranslation();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    const el = remoteVideoRef.current;
    if (el && remoteStream) {
      el.srcObject = remoteStream;
      el.play().catch((err) => {
        if (err.name !== "AbortError")
          console.warn("remote video play() failed:", err);
      });
    }
  }, [remoteStream]);

  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  if (callState === "idle") return null;

  const showControls = callState === "connecting" || callState === "connected";
  const isConnecting = callState === "calling" || callState === "ringing" || callState === "connecting";
  const isConnected = callState === "connected";
  const showConnectingIndicator = callState === "connecting";

  return (
    <div className="call-overlay">
      <div className="call-overlay-backdrop" />

      <div className="call-video-container">
        {remoteStream && !isAudio && (
          <video
            ref={remoteVideoRef}
            className="call-remote-video"
            autoPlay
            playsInline
          />
        )}
        {(!remoteStream || isAudio) && (
          <div className="call-remote-placeholder">
            {isAudio && <audio ref={remoteAudioRef} autoPlay playsInline />}
            <div className="call-peer-avatar">
              {peerName.charAt(0).toUpperCase()}
            </div>
            <div className="call-peer-name">{peerName}</div>
            <div className="call-status">
              {callState === "calling" && t("call.calling")}
              {callState === "ringing" && t("call.incoming")}
              {isConnecting && !isConnected && t("call.connecting")}
            </div>
            {showConnectingIndicator && (
              <div className="call-connecting-indicator">
                <span />
                <span />
                <span />
              </div>
            )}
            {isConnected && (
              <div className="call-duration">{formatDuration(callDuration)}</div>
            )}
          </div>
        )}
        {remoteStream && isConnected && !isAudio && (
          <div className="call-duration call-duration-overlay">
            {formatDuration(callDuration)}
          </div>
        )}
      </div>

      {!isAudio && (
        <div className="call-local-video-wrapper">
          {localStream ? (
            <video
              ref={localVideoRef}
              className="call-local-video"
              autoPlay
              playsInline
              muted
            />
          ) : (
            <div className="call-local-placeholder">
              <div className="call-peer-avatar small">
                {peerName.charAt(0).toUpperCase()}
              </div>
            </div>
          )}
        </div>
      )}

      {showControls && (
        <div className="call-controls">
          <button
            className={`call-control-btn ${isAudioMuted ? "active" : ""}`}
            onClick={onToggleAudio}
            title={isAudioMuted ? t("call.unmute") : t("call.mute")}
          >
            {isAudioMuted ? (
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="2" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              </svg>
            )}
          </button>

          <button
            className="call-control-btn call-end-btn"
            onClick={onEndCall}
            title={t("call.end")}
          >
            <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
              <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.956.956 0 0 1-.29-.71c0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28a11.27 11.27 0 0 0-2.67-1.85.996.996 0 0 1-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
            </svg>
          </button>

          {!isAudio && (
            <button
              className={`call-control-btn ${!isVideoEnabled ? "active" : ""}`}
              onClick={onToggleVideo}
              title={isVideoEnabled ? t("call.turn_off_video") : t("call.turn_on_video")}
            >
              {!isVideoEnabled ? (
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                  <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
                  <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="2" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                  <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
                </svg>
              )}
            </button>
          )}
        </div>
      )}

      {!showControls && (
        <div className="call-controls">
          <button className="call-control-btn call-end-btn" onClick={onEndCall} title={t("call.cancel")}>
            <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
              <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.956.956 0 0 1-.29-.71c0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28a11.27 11.27 0 0 0-2.67-1.85.996.996 0 0 1-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
