import { useEffect, useRef, useState, useCallback } from 'react';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

/**
 * Determine the WebSocket base URL dynamically.
 * - If REACT_APP_WS_URL is set, use it.
 * - Otherwise derive from window.location:
 *     http://192.168.1.100:3000 → ws://192.168.1.100:8000
 *     https://example.com → wss://example.com:8000
 */
function getWsBaseUrl() {
  if (process.env.REACT_APP_WS_URL) {
    return process.env.REACT_APP_WS_URL;
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname || 'localhost';
  return `${protocol}//${host}:8000`;
}

export const useWebRTC = ({ roomId, token, isInitiator = false, audioOnly = false }) => {
  const wsRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const initializedRef = useRef(false);

  const [connectionState, setConnectionState] = useState('new');
  const [remoteStream, setRemoteStream] = useState(null);
  const [peerConnected, setPeerConnected] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!roomId || !token || initializedRef.current) return;
    initializedRef.current = true;
    init();
    return () => cleanup();
    // eslint-disable-next-line
  }, [roomId, token]);

  const init = async () => {
    try {
      // 1. Get user media (audio-only if requested)
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: !audioOnly,
          audio: true,
        });
      } catch (err) {
        console.warn('Full media failed, falling back to audio only:', err);
        stream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: true,
        });
      }
      localStreamRef.current = stream;

      // 2. Create RTCPeerConnection
      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;

      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      const remoteStream = new MediaStream();
      remoteStreamRef.current = remoteStream;

      pc.ontrack = (event) => {
        event.streams[0].getTracks().forEach((t) => {
          if (!remoteStream.getTracks().find((x) => x.id === t.id)) {
            remoteStream.addTrack(t);
          }
        });
        setRemoteStream(remoteStream);
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'ice-candidate',
            candidate: event.candidate,
          }));
        }
      };

      pc.onconnectionstatechange = () => {
        setConnectionState(pc.connectionState);
        if (pc.connectionState === 'connected') {
          setPeerConnected(true);
        } else if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) {
          setPeerConnected(false);
        }
      };

      // 3. Connect WebSocket (dynamic URL — works on LAN IP and localhost)
      const wsBase = getWsBaseUrl();
      const wsUrl = `${wsBase}/ws/video/${roomId}/?token=${encodeURIComponent(token)}`;
      console.log('[WS] Connecting to:', wsUrl.replace(/token=[^&]+/, 'token=***'));

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WS] Connected');
      };

      ws.onmessage = async (event) => {
        let data;
        try {
          data = JSON.parse(event.data);
        } catch {
          return;
        }

        switch (data.type) {
          case 'peer-joined': {
            console.log('[WS] Peer joined:', data.username);
            if (isInitiator && pc.signalingState === 'stable') {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              ws.send(JSON.stringify({ type: 'offer', sdp: offer }));
            }
            break;
          }

          case 'offer': {
            await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            ws.send(JSON.stringify({ type: 'answer', sdp: answer }));
            for (const c of pendingCandidatesRef.current) {
              try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
            }
            pendingCandidatesRef.current = [];
            break;
          }

          case 'answer': {
            if (pc.signalingState !== 'stable') {
              await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
            }
            for (const c of pendingCandidatesRef.current) {
              try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
            }
            pendingCandidatesRef.current = [];
            break;
          }

          case 'ice-candidate': {
            if (data.candidate) {
              if (pc.remoteDescription?.type) {
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
                } catch (err) {
                  console.error('ICE add failed:', err);
                }
              } else {
                pendingCandidatesRef.current.push(data.candidate);
              }
            }
            break;
          }

          case 'chat':
            setChatMessages((prev) => [
              ...prev,
              { id: Date.now() + Math.random(), text: data.message, sender: 'them', username: data.from_username },
            ]);
            break;

          case 'peer-left':
            console.log('[WS] Peer left');
            setPeerConnected(false);
            break;

          case 'hangup':
            setPeerConnected(false);
            break;

          default:
            break;
        }
      };

      ws.onerror = (err) => {
        console.error('[WS] Error:', err);
        setError('Signaling error');
      };

      ws.onclose = (e) => {
        console.log('[WS] Closed:', e.code, e.reason);
        if (e.code === 4001) setError('Authentication failed');
      };
    } catch (err) {
      console.error('WebRTC init failed:', err);
      setError(err.message || 'Failed to initialize');
      setConnectionState('failed');
    }
  };

  const toggleMic = useCallback(() => {
    const tracks = localStreamRef.current?.getAudioTracks() || [];
    tracks.forEach((t) => (t.enabled = !t.enabled));
    return tracks[0]?.enabled ?? false;
  }, []);

  const toggleCamera = useCallback(() => {
    const tracks = localStreamRef.current?.getVideoTracks() || [];
    if (tracks.length === 0) return false;
    tracks.forEach((t) => (t.enabled = !t.enabled));
    return tracks[0]?.enabled ?? false;
  }, []);

  const sendChat = useCallback((message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'chat', message }));
      setChatMessages((prev) => [
        ...prev,
        { id: Date.now() + Math.random(), text: message, sender: 'me' },
      ]);
    }
  }, []);

  const hangup = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'hangup' }));
    }
    cleanup();
  }, []);

  const cleanup = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    initializedRef.current = false;
  };

  return {
    localStream: localStreamRef.current,
    remoteStream,
    peerConnected,
    connectionState,
    chatMessages,
    error,
    toggleMic,
    toggleCamera,
    sendChat,
    hangup,
  };
};