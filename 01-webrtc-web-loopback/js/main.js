'use strict';

// Define initial start time of the call (defined as connection between peers).
let startTime = null;

// Define peer connections, streams and video elements.
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

let localStream;
let remoteStream;

let localPeerConnection;
let remotePeerConnection;
// Define action buttons.
const callButton = document.getElementById('callButton');
const hangupButton = document.getElementById('hangupButton');

// Add click event handlers for buttons.
callButton.addEventListener('click', callAction);
hangupButton.addEventListener('click', hangupAction);

// Set up initial action buttons status: disable call and hangup.
callButton.disabled = true;
hangupButton.disabled = true;
navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true
}).then((mediaStream) => {
  localVideo.srcObject = mediaStream;
  localStream = mediaStream;
  trace('Received local stream.');
  callButton.disabled = false;  // Enable call button.
}).catch(handleLocalMediaStreamError);
trace('Requesting local stream.'); 
// Handles error by logging a message to the console.
function handleLocalMediaStreamError(error) {
  trace(`navigator.getUserMedia error: ${error.toString()}.`);
} 
// Define RTC peer connection behavior.


// Handles call button action: creates peer connection.
function callAction() {
  callButton.disabled = true;
  hangupButton.disabled = false; 
  trace('Starting call.');
  startTime = window.performance.now(); 
  const servers = null;  // Allows for RTC server configuration.  
  localPeerConnection = new RTCPeerConnection(servers);
  trace('Created local peer connection object localPeerConnection.'); 
  localPeerConnection.addEventListener('icecandidate', localIceCandidate);
  localPeerConnection.addEventListener(
    'iceconnectionstatechange', handleConnectionChange); 
  remotePeerConnection = new RTCPeerConnection(servers);
  trace('Created remote peer connection object remotePeerConnection.'); 
  remotePeerConnection.addEventListener('icecandidate', remoteIceCandidate);
  remotePeerConnection.addEventListener(
    'iceconnectionstatechange', handleConnectionChange);
  remotePeerConnection.addEventListener('addstream', (event) => {
    const mediaStream = event.stream;
    remoteVideo.srcObject = mediaStream;
    remoteStream = mediaStream;
    trace('Remote peer connection received remote stream.');
  }); 
  // Add local stream to connection and create offer to connect.
  localPeerConnection.addStream(localStream);
  trace('Added local stream to localPeerConnection.'); 
  trace('localPeerConnection createOffer start.');
  localPeerConnection.createOffer()
    .then((description) => {
      trace(`Offer from localPeerConnection:\n${description.sdp}`); 
      trace('localPeerConnection setLocalDescription start.');
      localPeerConnection.setLocalDescription(description); 
      trace('remotePeerConnection setRemoteDescription start.');
      remotePeerConnection.setRemoteDescription(description);
      trace('remotePeerConnection createAnswer start.');
      remotePeerConnection.createAnswer()
        .then((description) => {
          trace(`Answer from remotePeerConnection:\n${description.sdp}.`); 
          trace('remotePeerConnection setLocalDescription start.');
          remotePeerConnection.setLocalDescription(description); 
          trace('localPeerConnection setRemoteDescription start.');
          localPeerConnection.setRemoteDescription(description);
        }).catch(setSessionDescriptionError);
    }).catch(setSessionDescriptionError);
} 
// Handles hangup action: ends up call, closes connections and resets peers.
function hangupAction() {
  localPeerConnection.close();
  remotePeerConnection.close();
  localPeerConnection = null;
  remotePeerConnection = null;
  hangupButton.disabled = true;
  callButton.disabled = false;
  trace('Ending call.');
} 
// Define helper functions.  
// Gets the "other" peer connection.
function getOtherPeer(peerConnection) {
  return (peerConnection === localPeerConnection) ?
      remotePeerConnection : localPeerConnection;
} 
// Gets the name of a certain peer connection.
function getPeerName(peerConnection) {
  return (peerConnection === localPeerConnection) ?
      'localPeerConnection' : 'remotePeerConnection';
} 
// Connects with new peer candidate.
function localIceCandidate(event) {
  const peerConnection = event.target;
  const iceCandidate = event.candidate; 
  if (iceCandidate) {
    const newIceCandidate = new RTCIceCandidate(iceCandidate);
    remotePeerConnection.addIceCandidate(newIceCandidate)
      .then(() => {
      }).catch((error) => {
      }); 
  }
}
function remoteIceCandidate(event) {
  const peerConnection = event.target;
  const iceCandidate = event.candidate; 
  if (iceCandidate) {
    const newIceCandidate = new RTCIceCandidate(iceCandidate);
    localPeerConnection.addIceCandidate(newIceCandidate)
      .then(() => {
      }).catch((error) => {
      }); 
  }
}

// Logs changes to the connection state.
function handleConnectionChange(event) {
  const peerConnection = event.target;
  console.log('ICE state change event: ', event);
  trace(`${getPeerName(peerConnection)} ICE state: ` +
        `${peerConnection.iceConnectionState}.`);
}

// Logs error when setting session description fails.
function setSessionDescriptionError(error) {
  trace(`Failed to create session description: ${error.toString()}.`);
}

// Logs an action (text) and the time when it happened on the console.
function trace(text) {
  text = text.trim();
  const now = (window.performance.now() / 1000).toFixed(3);

  console.log(now, text);
}

