'use strict';

// Set up media stream constant and parameters.

// In this codelab, you will be streaming video only: "video: true".
// Audio will not be streamed because it is set to "audio: false" by default.
const mediaStreamConstraints = {
  video: true,
  audio: true
};

// Set up to exchange only video.

// Define initial start time of the call (defined as connection between peers).
let startTime = null;

// Define peer connections, streams and video elements.
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

let localStream;
let remoteStream;

let localPeerConnection;


// Define action buttons.
const startButton = document.getElementById('startButton');
const callButton = document.getElementById('callButton');
const hangupButton = document.getElementById('hangupButton');

// Set up initial action buttons status: disable call and hangup.
callButton.disabled = true;
hangupButton.disabled = true;

startButton.disabled = true;
navigator.mediaDevices.getUserMedia(mediaStreamConstraints)
  .then(gotLocalMediaStream).catch(handleLocalMediaStreamError);
trace('Requesting local stream.');
// Define MediaStreams callbacks.

localVideo.addEventListener('loadedmetadata', logVideoLoaded);
remoteVideo.addEventListener('loadedmetadata', logVideoLoaded);
remoteVideo.addEventListener('onresize', logResizedVideo);

const servers = null;  // Allows for RTC server configuration.

// Create peer connections and add behavior.
localPeerConnection = new RTCPeerConnection(servers);
trace('Created local peer connection object localPeerConnection.');

localPeerConnection.addEventListener('icecandidate', onRecvIce);
localPeerConnection.addEventListener(
  'iceconnectionstatechange', handleConnectionChange);

localPeerConnection.addEventListener('addstream', gotRemoteMediaStream);

// Add local stream to connection and create offer to connect.

trace('Added local stream to localPeerConnection.');
var socket = io('http://192.168.1.212:3001');
socket.on('offer', function (data) {
  console.log('--------------------\n' + data);
  var uint8View = new Uint8Array(data);
  var decoded = ToMessage.decode(uint8View);
  console.log(decoded);
  if(decoded.sdp) {
    var sdp = decoded.sdp;
    if(sdp.offerType == "answer") {
      trace('localPeerConnection setRemoteDescription start.');
      var desc = new RTCSessionDescription();
      desc.type = sdp.offerType;
      desc.sdp = sdp.desc;
      localPeerConnection.setRemoteDescription(desc)
        .then(() => {
          setRemoteDescriptionSuccess(localPeerConnection);
        }).catch(setSessionDescriptionError);
    }
    else if(sdp.offerType == "offer") {
      var desc = new RTCSessionDescription();
      desc.type = sdp.offerType;
      desc.sdp = sdp.desc;
      localPeerConnection.setRemoteDescription(desc)
        .then(() => {
          setRemoteDescriptionSuccess(localPeerConnection);
        }).catch(setSessionDescriptionError);
      localPeerConnection.createAnswer()
        .then(createdAnswer)
        .catch(setSessionDescriptionError);
    }
  }
  else if(decoded.ice) { 
    var newIce = new RTCIceCandidate({candidate: decoded.ice.sdp, sdpMid: decoded.ice.sdpMid, sdpMLineIndex: decoded.ice.MLineIndex })
    localPeerConnection.addIceCandidate(newIce)
      .then(() => {
        handleConnectionSuccess(localPeerConnection);
      }).catch((error) => {
        handleConnectionFailure(localPeerConnection, error);
      });
  }

});

var protoRoot = null;
var ToMessage = null;
var SessionDescription = null;
var socketIds = [];
protobuf.load("js/rtcmsg.proto", function(err, root) {
  if(err) {
    console.log("??");
    throw err;
  }
  protoRoot = root;
  ToMessage = protoRoot.lookupType("ToMessage");
  SessionDescription = protoRoot.lookupType("SessionDescription");
});

// Sets the MediaStream as the video element src.
function gotLocalMediaStream(mediaStream) {
  localVideo.srcObject = mediaStream;
  localStream = mediaStream;
  trace('Received local stream.');
  callButton.disabled = false;  // Enable call button.

  // Get local media stream tracks.
  const videoTracks = localStream.getVideoTracks();
  const audioTracks = localStream.getAudioTracks();
  if (videoTracks.length > 0) {
    trace(`Using video device: ${videoTracks[0].label}.`);
  }
  if (audioTracks.length > 0) {
    trace(`Using audio device: ${audioTracks[0].label}.`);
  }
  localPeerConnection.addStream(localStream);
}

// Handles error by logging a message to the console.
function handleLocalMediaStreamError(error) {
  trace(`navigator.getUserMedia error: ${error.toString()}.`);
}

// Handles remote MediaStream success by adding it as the remoteVideo src.
function gotRemoteMediaStream(event) {
  const mediaStream = event.stream;
  remoteVideo.srcObject = mediaStream;
  remoteStream = mediaStream;
  trace('Remote peer connection received remote stream.');
}


// Add behavior for video streams.

// Logs a message with the id and size of a video element.
function logVideoLoaded(event) {
  const video = event.target;
  trace(`${video.id} videoWidth: ${video.videoWidth}px, ` +
        `videoHeight: ${video.videoHeight}px.`);
}

// Logs a message with the id and size of a video element.
// This event is fired when video begins streaming.
function logResizedVideo(event) {
  logVideoLoaded(event);

  if (startTime) {
    const elapsedTime = window.performance.now() - startTime;
    startTime = null;
    trace(`Setup time: ${elapsedTime.toFixed(3)}ms.`);
  }
}




// Define RTC peer connection behavior.

// Connects with new peer candidate.
function onRecvIce(event) {
  var peerConnection = event.target;
  var iceCandidate = event.candidate;

  if (iceCandidate) {
    console.log(iceCandidate);
    var payload = {
      sdpMid: iceCandidate.sdpMid,
      sdp: iceCandidate.candidate,
      sdpMLineIndex: iceCandidate.sdpMLineIndex,
      serverUrl: ""
    };
    var lastPayload = {ice: payload};
    var message = ToMessage.create(lastPayload); // or use .fromObject if conversion is necessary 
    var buffer = ToMessage.encode(message).finish();
    var buffer2 = new ArrayBuffer(buffer.length);
    var uint8View = new Uint8Array(buffer2);
    uint8View.set(buffer);
    socket.emit('offer', buffer2);

    //
    // const newIceCandidate = new RTCIceCandidate(iceCandidate);
    // const otherPeer = getOtherPeer(peerConnection);
    //
    // otherPeer.addIceCandidate(newIceCandidate)
    //   .then(() => {
    //     handleConnectionSuccess(peerConnection);
    //   }).catch((error) => {
    //     handleConnectionFailure(peerConnection, error);
    //   });

    trace(` ICE candidate:\n` +
          `${event.candidate.candidate}.`);
  }
}

// Logs that the connection succeeded.
function handleConnectionSuccess(peerConnection) {
  trace(`addIceCandidate success.`);
};

// Logs that the connection failed.
function handleConnectionFailure(peerConnection, error) {
  trace(`failed to add ICE Candidate:\n`+
        `${error.toString()}.`);
}

// Logs changes to the connection state.
function handleConnectionChange(event) {
  const peerConnection = event.target;
  console.log('ICE state change event: ', event);
  trace(`ICE state: ` +
        `${peerConnection.iceConnectionState}.`);
}

// Logs error when setting session description fails.
function setSessionDescriptionError(error) {
  trace(`Failed to create session description: ${error.toString()}.`);
}

// Logs success when setting session description.
function setDescriptionSuccess(peerConnection, functionName) {
  trace(`${functionName} complete.`);
}

// Logs success when localDescription is set.
function setLocalDescriptionSuccess(peerConnection) {
  setDescriptionSuccess(peerConnection, 'setLocalDescription');
}

// Logs success when remoteDescription is set.
function setRemoteDescriptionSuccess(peerConnection) {
  setDescriptionSuccess(peerConnection, 'setRemoteDescription');
}

// Logs offer creation and sets peer connection session descriptions.
function createdOffer(description) {
  trace(`Offer from localPeerConnection:\n${description.sdp}`);

  trace('localPeerConnection setLocalDescription start.');
  localPeerConnection.setLocalDescription(description)
    .then(() => {
      setLocalDescriptionSuccess(localPeerConnection);
    }).catch(setSessionDescriptionError);

  var payload = {offerType: description.type, desc: description.sdp};
  var lastPayload = {sdp: payload};
  var message = ToMessage.create(lastPayload); // or use .fromObject if conversion is necessary 
  // Encode a message to an Uint8Array (browser) or Buffer (node)
  var buffer = ToMessage.encode(message).finish();
  var buffer2 = new ArrayBuffer(buffer.length);
  var uint8View = new Uint8Array(buffer2);
  uint8View.set(buffer);

  socket.emit('offer', buffer2);
}

// Logs answer to offer creation and sets peer connection session descriptions.
function createdAnswer(description) { 
  trace('localPeerConnection setRemoteDescription start.');
  localPeerConnection.setLocalDescription(description)
    .then(() => {
      setRemoteDescriptionSuccess(localPeerConnection);
    }).catch(setSessionDescriptionError);

  var payload = {offerType: description.type, desc: description.sdp};
  var lastPayload = {sdp: payload};
  var message = ToMessage.create(lastPayload); // or use .fromObject if conversion is necessary 
  // Encode a message to an Uint8Array (browser) or Buffer (node)
  var buffer = ToMessage.encode(message).finish();
  var buffer2 = new ArrayBuffer(buffer.length);
  var uint8View = new Uint8Array(buffer2);
  uint8View.set(buffer); 
  socket.emit('offer', buffer2);
}


// Define and add behavior to buttons.

// Handles start button action: creates local MediaStream.
function startAction() {
}

// Handles call button action: creates peer connection.
function callAction() {
  callButton.disabled = true;
  hangupButton.disabled = false;

  trace('Starting call.');
  startTime = window.performance.now(); 

  trace('localPeerConnection createOffer start.');
  localPeerConnection.createOffer()
    .then(createdOffer).catch(setSessionDescriptionError);
}

// Handles hangup action: ends up call, closes connections and resets peers.
function hangupAction() {
  localPeerConnection.close();
  localPeerConnection = null;
  hangupButton.disabled = true;
  callButton.disabled = false;
  trace('Ending call.');
}

// Add click event handlers for buttons.
startButton.addEventListener('click', startAction);
callButton.addEventListener('click', callAction);
hangupButton.addEventListener('click', hangupAction);


// Define helper functions.  
// Logs an action (text) and the time when it happened on the console.
function trace(text) {
  text = text.trim();
  const now = (window.performance.now() / 1000).toFixed(3);

  console.log(now, text);
}
