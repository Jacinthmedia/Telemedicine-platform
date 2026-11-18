import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { useWebRTC } from '../hooks/useWebRTC';
import {
  Mic, MicOff, Video as VideoIcon, VideoOff, Phone, PhoneOff,
  MessageSquare, Monitor, MonitorOff, MoreVertical,
  Users, Clock, Shield, Wifi, Volume2, VolumeX,
  Maximize, Minimize, Send, X, AlertCircle, Check,
} from 'lucide-react';
import './VideoConsultation.css';

const VideoConsultation = () => {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const chatEndRef = useRef(null);
  const callTimerRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState('');
  const [appointment, setAppointment] = useState(null);
  const [videoCall, setVideoCall] = useState(null);
  const [token, setToken] = useState(null);
  const [roomId, setRoomId] = useState(null);

  // UI
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSidebarTab, setActiveSidebarTab] = useState('chat');
  const [showMenu, setShowMenu] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [newMessage, setNewMessage] = useState('');

  const isDoctor = user?.role === 'doctor';
  const isAudioOnly = appointment?.consultation_type === 'audio';

  // ============================================
  // WEBRTC
  // ============================================
  const {
    localStream,
    remoteStream,
    peerConnected,
    connectionState,
    chatMessages,
    error: rtcError,
    toggleMic: rtcToggleMic,
    toggleCamera: rtcToggleCamera,
    sendChat,
    hangup,
  } = useWebRTC({
    roomId,
    token,
    isInitiator: isDoctor,
    audioOnly: isAudioOnly,
  });

  // ============================================
  // SETUP
  // ============================================
  useEffect(() => {
    initCall();
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
    // eslint-disable-next-line
  }, [appointmentId]);

  useEffect(() => {
    if (localVideoRef.current && localStream && !isAudioOnly) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isAudioOnly]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream && !isAudioOnly) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, isAudioOnly]);

  useEffect(() => {
    if (peerConnected) {
      callTimerRef.current = setInterval(() => {
        setCallDuration((d) => d + 1);
      }, 1000);
    }
    return () => clearInterval(callTimerRef.current);
  }, [peerConnected]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const initCall = async () => {
    try {
      setLoading(true);
      setInitError('');

      const accessToken = localStorage.getItem('access_token');
      if (!accessToken) {
        setInitError('You are not authenticated');
        return;
      }

      const apptRes = await api.get(`/appointments/${appointmentId}/`);
      const appt = apptRes.data.data || apptRes.data;
      setAppointment(appt);

      let vc = null;
      try {
        const startRes = await api.post('/video-calls/start/', {
          appointment_id: appointmentId,
        });
        vc = startRes.data.data || startRes.data;
      } catch (err) {
      }
      setVideoCall(vc);

      setRoomId(`appt-${appointmentId}`);
      setToken(accessToken);
    } catch (err) {
      console.error('Init failed:', err);
      setInitError(
        err.response?.data?.message ||
        err.response?.data?.detail ||
        'Failed to initialize call'
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // CONTROLS
  // ============================================
  const handleToggleMic = () => setMicOn(rtcToggleMic());
  const handleToggleCamera = () => setCameraOn(rtcToggleCamera());
  const toggleSpeaker = () => setSpeakerOn((p) => !p);

  const toggleFullscreen = () => {
    const el = document.getElementById('vc-stage');
    if (!document.fullscreenElement) {
      el?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
        setIsScreenSharing(true);
        screenStream.getVideoTracks()[0].onended = () => {
          if (localStream && localVideoRef.current) {
            localVideoRef.current.srcObject = localStream;
          }
          setIsScreenSharing(false);
        };
      } catch (err) {
        console.error('Screen share failed:', err);
      }
    } else {
      if (localStream && localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }
      setIsScreenSharing(false);
    }
  };

  const sendMessage = () => {
    if (!newMessage.trim()) return;
    sendChat(newMessage.trim());
    setNewMessage('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const endCall = async () => {
    try {
      hangup();
      if (videoCall?.id) {
        await api.post(`/video-calls/${videoCall.id}/end/`);
      }
    } catch (err) {
      console.error('End call error:', err);
    }
    const role = user?.role || 'patient';
    navigate(`/${role}/dashboard`);
  };

  // ============================================
  // HELPERS
  // ============================================
  const formatDuration = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const otherUser = isDoctor
    ? appointment?.patient?.user
    : appointment?.doctor?.user;
  const otherName = otherUser
    ? `${otherUser.first_name || ''} ${otherUser.last_name || ''}`.trim() || 'User'
    : 'Waiting...';
  const otherRole = isDoctor ? 'Patient' : 'Doctor';
  const getInitials = () => {
    const f = otherUser?.first_name?.[0] || '';
    const l = otherUser?.last_name?.[0] || '';
    return (f + l).toUpperCase() || 'U';
  };

  // ============================================
  // RENDER
  // ============================================
  if (loading) {
    return (
      <div className="vc-loading-page">
        <div className="vc-connecting-animation">
          <div className="vc-pulse-ring" />
          <div className="vc-pulse-ring delay-1" />
          <div className="vc-pulse-ring delay-2" />
          <div className="vc-pulse-core">
            {isAudioOnly ? <Phone size={28} /> : <VideoIcon size={28} />}
          </div>
        </div>
        <h2>
          {isAudioOnly
            ? 'Connecting your voice call...'
            : 'Connecting to your consultation...'}
        </h2>
        <p>Setting up secure {isAudioOnly ? 'audio' : 'video'} link</p>
      </div>
    );
  }

  if (initError || rtcError) {
    return (
      <div className="vc-error-page">
        <AlertCircle size={52} />
        <h2>Unable to start call</h2>
        <p>{initError || rtcError}</p>
        <button className="vc-btn-primary" onClick={() => navigate(-1)}>
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className={`vc-root ${isAudioOnly ? 'vc-audio-mode' : ''}`}>
      {/* Top bar */}
      <header className="vc-topbar">
        <div className="vc-topbar-left">
          <div className={`vc-conn-dot ${peerConnected ? 'connected' : ''}`} />
          <div className="vc-topbar-info">
            <h3>{otherName}</h3>
            <span>
              {otherRole} ·{' '}
              {peerConnected
                ? 'Connected'
                : connectionState === 'connecting'
                ? 'Connecting...'
                : 'Waiting'}
              {isAudioOnly && ' · Voice call'}
            </span>
          </div>
        </div>

        <div className="vc-topbar-center">
          <div className="vc-timer">
            <Clock size={14} />
            {formatDuration(callDuration)}
          </div>
          <div className="vc-secure">
            <Shield size={14} /> End-to-end encrypted
          </div>
        </div>

        <div className="vc-topbar-right">
          <div className="vc-quality" title="Connection quality">
            <Wifi size={16} />
          </div>
          <button
            className="vc-icon-btn"
            onClick={() => setSidebarOpen((p) => !p)}
            title="Toggle sidebar"
          >
            <Users size={18} />
          </button>
          <div className="vc-menu-wrap">
            <button className="vc-icon-btn" onClick={() => setShowMenu((p) => !p)}>
              <MoreVertical size={18} />
            </button>
            {showMenu && (
              <div className="vc-menu">
                {!isAudioOnly && (
                  <button onClick={toggleFullscreen}>
                    {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
                    {isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                  </button>
                )}
                <button className="danger" onClick={() => setShowEndConfirm(true)}>
                  <Phone size={14} /> End call
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main stage */}
      <div className="vc-body">
        <div
          className={`vc-stage ${sidebarOpen ? '' : 'sidebar-collapsed'}`}
          id="vc-stage"
        >
          {/* ============ REMOTE ============ */}
          <div className="vc-remote">
            {/* Voice-only view */}
            {isAudioOnly ? (
              <div className="vc-voice-layout">
                <div className="vc-voice-avatar-wrap">
                  <div className={`vc-voice-avatar ${peerConnected ? 'connected' : ''}`}>
                    {getInitials()}
                  </div>
                  {peerConnected && (
                    <>
                      <span className="vc-voice-ring r1" />
                      <span className="vc-voice-ring r2" />
                    </>
                  )}
                </div>
                <h2>{otherName}</h2>
                <p className="vc-voice-status">
                  {peerConnected
                    ? 'On call'
                    : connectionState === 'connecting'
                    ? 'Connecting...'
                    : 'Waiting to join...'}
                </p>
                {peerConnected && (
                  <div className="vc-voice-waves">
                    <span /><span /><span /><span /><span /><span /><span />
                  </div>
                )}
              </div>
            ) : remoteStream ? (
              /* Video view */
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="vc-remote-video"
              />
            ) : (
              <div className="vc-remote-placeholder">
                <div className="vc-avatar-large">{getInitials()}</div>
                <h2>{otherName}</h2>
                <p className="vc-remote-status">
                  {peerConnected
                    ? 'In call'
                    : connectionState === 'connecting'
                    ? 'Connecting...'
                    : 'Waiting to join...'}
                </p>
                {peerConnected && (
                  <div className="vc-audio-bars">
                    <span /><span /><span /><span /><span />
                  </div>
                )}
              </div>
            )}

            <div className="vc-remote-label">
              <span className="vc-live-dot" />
              {otherName} ({otherRole})
            </div>
          </div>

          {/* ============ LOCAL PiP (video only) ============ */}
          {!isAudioOnly && (
            <div className={`vc-local ${!cameraOn ? 'camera-off' : ''}`}>
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="vc-local-video"
              />
              {!cameraOn && (
                <div className="vc-local-off">
                  <VideoOff size={28} />
                  <span>Camera off</span>
                </div>
              )}
              <div className="vc-local-label">
                You {micOn ? '' : '(muted)'}
              </div>
            </div>
          )}

          {/* ============ CONTROLS ============ */}
          <div className="vc-controls">
            <button
              className={`vc-ctrl ${!micOn ? 'off' : ''}`}
              onClick={handleToggleMic}
              title={micOn ? 'Mute' : 'Unmute'}
            >
              {micOn ? <Mic size={20} /> : <MicOff size={20} />}
              <span>{micOn ? 'Mute' : 'Unmute'}</span>
            </button>

            {!isAudioOnly && (
              <button
                className={`vc-ctrl ${!cameraOn ? 'off' : ''}`}
                onClick={handleToggleCamera}
                title={cameraOn ? 'Camera off' : 'Camera on'}
              >
                {cameraOn ? <VideoIcon size={20} /> : <VideoOff size={20} />}
                <span>{cameraOn ? 'Stop video' : 'Start video'}</span>
              </button>
            )}

            <button
              className={`vc-ctrl ${!speakerOn ? 'off' : ''}`}
              onClick={toggleSpeaker}
              title={speakerOn ? 'Mute speaker' : 'Unmute speaker'}
            >
              {speakerOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
              <span>Speaker</span>
            </button>

            {!isAudioOnly && (
              <button
                className={`vc-ctrl ${isScreenSharing ? 'active' : ''}`}
                onClick={toggleScreenShare}
              >
                {isScreenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />}
                <span>Share</span>
              </button>
            )}

            <button
              className="vc-ctrl chat-ctrl"
              onClick={() => {
                setSidebarOpen(true);
                setActiveSidebarTab('chat');
              }}
            >
              <MessageSquare size={20} />
              <span>Chat</span>
            </button>

            <button className="vc-ctrl end-ctrl" onClick={() => setShowEndConfirm(true)}>
              {isAudioOnly ? <PhoneOff size={20} /> : <Phone size={20} />}
              <span>End</span>
            </button>
          </div>
        </div>

        {/* ============ SIDEBAR ============ */}
        {sidebarOpen && (
          <aside className="vc-sidebar">
            <div className="vc-sidebar-tabs">
              <button
                className={activeSidebarTab === 'chat' ? 'active' : ''}
                onClick={() => setActiveSidebarTab('chat')}
              >
                <MessageSquare size={15} /> Chat
              </button>
              <button
                className={activeSidebarTab === 'info' ? 'active' : ''}
                onClick={() => setActiveSidebarTab('info')}
              >
                <Users size={15} /> Info
              </button>
              <button className="vc-sidebar-close" onClick={() => setSidebarOpen(false)}>
                <X size={16} />
              </button>
            </div>

            {activeSidebarTab === 'chat' && (
              <>
                <div className="vc-chat-messages">
                  {chatMessages.length === 0 ? (
                    <div className="vc-chat-empty">
                      <MessageSquare size={32} />
                      <p>No messages yet</p>
                      <span>Say hello to {otherName}</span>
                    </div>
                  ) : (
                    chatMessages.map((m) => (
                      <div
                        key={m.id}
                        className={`vc-msg ${m.sender === 'me' ? 'me' : 'them'}`}
                      >
                        <div className="vc-msg-bubble">{m.text}</div>
                      </div>
                    ))
                  )}
                  <div ref={chatEndRef} />
                </div>

                <div className="vc-chat-input">
                  <textarea
                    rows={1}
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                  />
                  <button onClick={sendMessage} disabled={!newMessage.trim()}>
                    <Send size={16} />
                  </button>
                </div>
              </>
            )}

            {activeSidebarTab === 'info' && (
              <div className="vc-info">
                <div className="vc-info-avatar">{getInitials()}</div>
                <h4>{otherName}</h4>
                <p className="vc-info-role">{otherRole}</p>

                <div className="vc-info-rows">
                  <div>
                    <span>Appointment</span>
                    <strong>#{appointment?.id || appointmentId}</strong>
                  </div>
                  <div>
                    <span>Date</span>
                    <strong>{appointment?.appointment_date || 'N/A'}</strong>
                  </div>
                  <div>
                    <span>Time</span>
                    <strong>
                      {appointment?.start_time?.slice(0, 5) || 'N/A'} -{' '}
                      {appointment?.end_time?.slice(0, 5) || 'N/A'}
                    </strong>
                  </div>
                  <div>
                    <span>Type</span>
                    <strong>{appointment?.consultation_type || 'video'}</strong>
                  </div>
                  {appointment?.reason && (
                    <div>
                      <span>Reason</span>
                      <strong>{appointment.reason}</strong>
                    </div>
                  )}
                </div>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* End confirm modal */}
      {showEndConfirm && (
        <div className="vc-modal-backdrop" onClick={() => setShowEndConfirm(false)}>
          <div className="vc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="vc-modal-icon">
              {isAudioOnly ? <PhoneOff size={26} /> : <Phone size={26} />}
            </div>
            <h3>End this {isAudioOnly ? 'call' : 'consultation'}?</h3>
            <p>
              Duration: {formatDuration(callDuration)}
              <br />
              Both parties will be disconnected.
            </p>
            <div className="vc-modal-actions">
              <button
                className="vc-btn-secondary"
                onClick={() => setShowEndConfirm(false)}
              >
                Cancel
              </button>
              <button className="vc-btn-danger" onClick={endCall}>
                <Check size={16} /> End Call
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoConsultation;