import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import './VideoCall.css';

const VideoCall = () => {
  const { appointmentId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [callData, setCallData] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const timerRef = useRef(null);
  
  useEffect(() => {
    loadCall();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      endCall();
    };
  }, []);
  
  useEffect(() => {
    if (isConnected) {
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isConnected]);
  
  const loadCall = async () => {
    try {
      const response = await api.get(`/video-calls/appointment/${appointmentId}/`);
      setCallData(response.data);
      // Simulate connection
      setTimeout(() => {
        setIsConnected(true);
        toast.success('Video call connected!');
        setLoading(false);
      }, 2000);
    } catch (error) {
      toast.error('Failed to load video call');
      navigate('/appointments');
    }
  };
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };
  
  const toggleMute = () => setIsMuted(!isMuted);
  const toggleVideo = () => setIsVideoOff(!isVideoOff);
  
  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setIsScreenSharing(true);
      } else {
        // Stop screen sharing
        if (localVideoRef.current?.srcObject) {
          localVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
          localVideoRef.current.srcObject = null;
        }
        setIsScreenSharing(false);
      }
    } catch (error) {
      toast.error('Screen sharing failed');
    }
  };
  
  const endCall = async () => {
    try {
      await api.post(`/video-calls/${callData?.id}/end/`);
      toast.success('Call ended');
      navigate('/appointments');
    } catch (error) {
      navigate('/appointments');
    }
  };
  
  const sendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    const msg = {
      id: Date.now(),
      sender: user?.username,
      message: newMessage,
      time: new Date().toLocaleTimeString(),
      isSelf: true,
    };
    setMessages([...messages, msg]);
    setNewMessage('');
  };
  
  if (loading) {
    return (
      <div className="video-call-loading">
        <div className="loading-spinner"></div>
        <p>Connecting to video call...</p>
      </div>
    );
  }
  
  return (
    <div className="video-call-container">
      <div className="video-call-header">
        <div className="call-info">
          <h3>Video Consultation</h3>
          <span className="call-duration">{formatTime(duration)}</span>
        </div>
        <div className="call-status">
          <span className={`status-dot ${isConnected ? 'connected' : 'connecting'}`}></span>
          {isConnected ? 'Connected' : 'Connecting...'}
        </div>
      </div>
      
      <div className="video-grid">
        {/* Remote Video (Doctor/Patient) */}
        <div className="video-participant main">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={isVideoOff ? 'video-off' : ''}
          />
          <div className="participant-overlay">
            <div className="participant-name">
              {callData?.doctor_name || 'Doctor'}
            </div>
            <div className="participant-status">
              {isConnected ? 'Connected' : 'Connecting...'}
            </div>
          </div>
        </div>
        
        {/* Local Video (Self) */}
        <div className="video-participant small">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={isVideoOff ? 'video-off' : ''}
          />
          <div className="participant-overlay">
            <div className="participant-name">You</div>
          </div>
        </div>
      </div>
      
      {/* Call Controls */}
      <div className="call-controls">
        <button 
          className={`control-btn ${isMuted ? 'active' : ''}`}
          onClick={toggleMute}
        >
          <i className={`fas ${isMuted ? 'fa-microphone-slash' : 'fa-microphone'}`}></i>
        </button>
        
        <button 
          className={`control-btn ${isVideoOff ? 'active' : ''}`}
          onClick={toggleVideo}
        >
          <i className={`fas ${isVideoOff ? 'fa-video-slash' : 'fa-video'}`}></i>
        </button>
        
        <button 
          className={`control-btn ${isScreenSharing ? 'active' : ''}`}
          onClick={toggleScreenShare}
        >
          <i className="fas fa-desktop"></i>
        </button>
        
        <button className="control-btn end-call" onClick={endCall}>
          <i className="fas fa-phone-slash"></i>
        </button>
      </div>
      
      {/* Chat */}
      <div className="call-chat">
        <div className="chat-header">
          <h4>Live Chat</h4>
        </div>
        <div className="chat-messages">
          {messages.map((msg) => (
            <div key={msg.id} className={`chat-message ${msg.isSelf ? 'self' : 'other'}`}>
              <div className="message-content">
                <div className="message-sender">{msg.sender}</div>
                <div className="message-text">{msg.message}</div>
                <div className="message-time">{msg.time}</div>
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={sendMessage} className="chat-input">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
          />
          <button type="submit">
            <i className="fas fa-paper-plane"></i>
          </button>
        </form>
      </div>
    </div>
  );
};

export default VideoCall;