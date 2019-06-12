package com.example.webrtc;

import android.Manifest;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.provider.Settings;
import android.support.annotation.NonNull;
import android.support.v4.app.ActivityCompat;
import android.support.v7.app.AlertDialog;
import android.support.v7.app.AppCompatActivity;
import android.util.DisplayMetrics;
import android.util.Log;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.FrameLayout;

import com.google.protobuf.InvalidProtocolBufferException;

import org.webrtc.AudioSource;
import org.webrtc.AudioTrack;
import org.webrtc.Camera1Enumerator;
import org.webrtc.CameraEnumerator;
import org.webrtc.CameraVideoCapturer;
import org.webrtc.EglBase;
import org.webrtc.IceCandidate;
import org.webrtc.MediaConstraints;
import org.webrtc.MediaStream;
import org.webrtc.PeerConnection;
import org.webrtc.PeerConnectionFactory;
import org.webrtc.SdpObserver;
import org.webrtc.SessionDescription;
import org.webrtc.SurfaceViewRenderer;
import org.webrtc.VideoCapturer;

import org.webrtc.VideoRenderer;
import org.webrtc.VideoSource;
import org.webrtc.VideoTrack;

import java.net.URISyntaxException;
import java.util.ArrayList;
import java.util.List;

import io.socket.client.IO;
import io.socket.client.Socket;
import io.socket.emitter.Emitter;

public class MainActivity extends AppCompatActivity  implements View.OnClickListener {
    PeerConnectionFactory peerConnectionFactory;
    MediaConstraints audioConstraints;
    MediaConstraints videoConstraints;
    MediaConstraints sdpConstraints;
    VideoSource videoSource;
    VideoTrack localVideoTrack;
    AudioSource audioSource;
    AudioTrack localAudioTrack;

    SurfaceViewRenderer localVideoView;
    SurfaceViewRenderer remoteVideoView;
    VideoRenderer localRenderer;
    VideoRenderer remoteRenderer;

    PeerConnection localPeer;
    Button start, call, hangup;
    private Socket mSocket;
    // Socket서버에 connect 되면 발생하는 이벤트
    private Emitter.Listener onConnect = new Emitter.Listener() {
        @Override
        public void call(Object... args) {
//            Rtcmsg.ToMessage.Builder tm = Rtcmsg.ToMessage.newBuilder();
//            Rtcmsg.IceCandidate.Builder ic = Rtcmsg.IceCandidate.newBuilder();
//            ic.setSdp("sdp");
//            ic.setSdpMLineIndex(1);
//            ic.setServerUrl("google.com");
//            ic.setSdpMid("sdp mid");
//            tm.setIce(ic.build());
//            byte[] gg = tm.build().toByteArray();
//            mSocket.emit("clientMessage", gg);
        }
    };

    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults)
    {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);

        if (grantResults.length > 0)
        {
            for (int i=0; i<grantResults.length; ++i)
            {
                if (grantResults[i] == PackageManager.PERMISSION_DENIED)
                {
                    // 하나라도 거부한다면.
                    new AlertDialog.Builder(this).setTitle("알림").setMessage("권한을 허용해주셔야 앱을 이용할 수 있습니다.")
                            .setPositiveButton("종료", new DialogInterface.OnClickListener() {
                                public void onClick(DialogInterface dialog, int which) {
                                    dialog.dismiss();
                                    //                                        m_oMainActivity.finish();
                                }
                            }).setNegativeButton("권한 설정", new DialogInterface.OnClickListener() {
                        public void onClick(DialogInterface dialog, int which) {
                            dialog.dismiss();
                            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
                                    .setData(Uri.parse("package:" + getApplicationContext().getPackageName()));
                            getApplicationContext().startActivity(intent);
                        }
                    }).setCancelable(false).show();

                    return;
                }
            }
        }


    }
    public static boolean hasPermissions(Context context, String... permissions) {
        if (context != null && permissions != null) {
            for (String permission : permissions) {
                if (ActivityCompat.checkSelfPermission(context, permission) != PackageManager.PERMISSION_GRANTED) {
                    return false;
                }
            }
        }
        return true;
    }
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        int PERMISSION_ALL = 1;
        String[] PERMISSIONS = {Manifest.permission.WRITE_EXTERNAL_STORAGE,
                Manifest.permission.READ_EXTERNAL_STORAGE,
                Manifest.permission.RECORD_AUDIO,
                Manifest.permission.BLUETOOTH,
                Manifest.permission.BLUETOOTH_ADMIN,
                Manifest.permission.ACCESS_COARSE_LOCATION,
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.CAMERA,
                Manifest.permission.INTERNET,
                Manifest.permission.ACCESS_NETWORK_STATE,

        };

        if (!hasPermissions(this, PERMISSIONS)) {
            ActivityCompat.requestPermissions(this, PERMISSIONS, PERMISSION_ALL);
        }
        try {
            mSocket = IO.socket("http://192.168.1.212:3001");
            mSocket.connect();
            mSocket.on(Socket.EVENT_CONNECT, onConnect);
            mSocket.on("offer", onMessageReceived);
            mSocket.on("answer", onMessageReceived);
        } catch(URISyntaxException e) {
            e.printStackTrace();
        }
        initViews();
        initVideos();
    }


    private void initViews() {
        start = (Button) findViewById(R.id.start_call);
        call = (Button) findViewById(R.id.init_call);
        hangup = (Button) findViewById(R.id.end_call);
        localVideoView = (SurfaceViewRenderer) findViewById(R.id.local_gl_surface_view);
        remoteVideoView = (SurfaceViewRenderer) findViewById(R.id.remote_gl_surface_view);

        start.setOnClickListener(this);
        call.setOnClickListener(this);
        hangup.setOnClickListener(this);
    }

    private void initVideos() {
        EglBase rootEglBase = EglBase.create();
        localVideoView.init(rootEglBase.getEglBaseContext(), null);
        remoteVideoView.init(rootEglBase.getEglBaseContext(), null);
        localVideoView.setZOrderMediaOverlay(true);
        remoteVideoView.setZOrderMediaOverlay(true);
    }




    @Override
    public void onClick(View v) {
        switch (v.getId()) {
            case R.id.start_call: {
                start();
                break;
            }
            case R.id.init_call: {
                call();
                break;
            }
            case R.id.end_call: {
                hangup();
                break;
            }
        }
    }
    private VideoCapturer createVideoCapturer() {
        VideoCapturer videoCapturer;
        videoCapturer = createCameraCapturer(new Camera1Enumerator(false));
        return videoCapturer;
    }

    private VideoCapturer createCameraCapturer(CameraEnumerator enumerator) {
        final String[] deviceNames = enumerator.getDeviceNames();

        // Trying to find a front facing camera!
        for (String deviceName : deviceNames) {
            if (enumerator.isFrontFacing(deviceName)) {
                VideoCapturer videoCapturer = enumerator.createCapturer(deviceName, null);

                if (videoCapturer != null) {
                    return videoCapturer;
                }
            }
        }

        // We were not able to find a front cam. Look for other cameras
        for (String deviceName : deviceNames) {
            if (!enumerator.isFrontFacing(deviceName)) {
                VideoCapturer videoCapturer = enumerator.createCapturer(deviceName, null);
                if (videoCapturer != null) {
                    return videoCapturer;
                }
            }
        }

        return null;
    }

    public void start() {
        start.setEnabled(false);
        call.setEnabled(true);
        //Initialize PeerConnectionFactory globals.
        //Params are context, initAudio,initVideo and videoCodecHwAcceleration
        PeerConnectionFactory.initialize(
                PeerConnectionFactory.InitializationOptions.builder(this).createInitializationOptions()

        );

        //Create a new PeerConnectionFactory instance.
        PeerConnectionFactory.Options options = new PeerConnectionFactory.Options();
        peerConnectionFactory = new PeerConnectionFactory(options);

        //Now create a VideoCapturer instance. Callback methods are there if you want to do something! Duh!
        VideoCapturer videoCapturerAndroid = createVideoCapturer(); // getVideoCapturer(new CustomCameraEventsHandler());

        //Create MediaConstraints - Will be useful for specifying video and audio constraints.
        audioConstraints = new MediaConstraints();
        videoConstraints = new MediaConstraints();

        //Create a VideoSource instance
        videoSource = peerConnectionFactory.createVideoSource(videoCapturerAndroid);
        localVideoTrack = peerConnectionFactory.createVideoTrack("100", videoSource);

        //create an AudioSource instance
        audioSource = peerConnectionFactory.createAudioSource(audioConstraints);
        localAudioTrack = peerConnectionFactory.createAudioTrack("101", audioSource);
        localVideoView.setVisibility(View.VISIBLE);

        videoCapturerAndroid.startCapture(1000, 1000, 30);
        //create a videoRenderer based on SurfaceViewRenderer instance
        localRenderer = new VideoRenderer(localVideoView);
        // And finally, with our VideoRenderer ready, we
        // can add our renderer to the VideoTrack.
        localVideoTrack.addRenderer(localRenderer);

        List<PeerConnection.IceServer> iceServers = new ArrayList<>();
//        iceServers.add(new PeerConnection.IceServer("stun:stun.l.google.com:19302"));
        //create sdpConstraints
        sdpConstraints = new MediaConstraints();
        sdpConstraints.mandatory.add(new MediaConstraints.KeyValuePair("offerToReceiveAudio", "true"));
        sdpConstraints.mandatory.add(new MediaConstraints.KeyValuePair("offerToReceiveVideo", "true"));

        //creating localPeer
        localPeer = peerConnectionFactory.createPeerConnection(iceServers, sdpConstraints, new CustomPeerConnectionObserver("localPeerCreation") {
            @Override
            public void onIceCandidate(IceCandidate iceCandidate) {
                super.onIceCandidate(iceCandidate);
                onIceCandidateReceived(localPeer, iceCandidate);
            }

            public void onAddStream(MediaStream mediaStream) {
                super.onAddStream(mediaStream);
                gotRemoteStream(mediaStream);
            }
        });

        //creating remotePeer

        //creating local mediastream
        MediaStream stream = peerConnectionFactory.createLocalMediaStream("102");
        stream.addTrack(localAudioTrack);
        stream.addTrack(localVideoTrack);
        localPeer.addStream(stream);
    }

    private Emitter.Listener onMessageReceived = new Emitter.Listener() {
        @Override
        public void call(Object... args) {
            // 전달받은 데이터는 아래와 같이 추출할 수 있습니다.
            byte[] arr = (byte[])args[0];
            Log.d("TAG", arr + "");
            try {
                Rtcmsg.ToMessage tm = Rtcmsg.ToMessage.parseFrom(arr);
                Log.e("TAG", tm.toString());
                if(tm.hasIce()) {
                    Rtcmsg.IceCandidate recvic = tm.getIce();
                    IceCandidate ic = new IceCandidate(recvic.getSdpMid(), recvic.getSdpMLineIndex(), recvic. getSdp());
                    localPeer.addIceCandidate(ic);
//                    Log.e("TAG", String.format("%s %d %s %s", ic.getSdpMid(), ic.getSdpMLineIndex(), ic.getSdp(), ic.getServerUrl()));
                }
                else if(tm.hasSdp()) {
                    SessionDescription.Type sdt = SessionDescription.Type.ANSWER;
                    Rtcmsg.SessionDescription protoSd = tm.getSdp();
                    if(protoSd.getOfferType().equalsIgnoreCase("OFFER")) {
                        sdt = SessionDescription.Type.OFFER;
                        SessionDescription sd = new SessionDescription(sdt, protoSd.getDesc());
                        int flag = 1;
                        if(flag == 1) {
                            localPeer.setRemoteDescription(new CustomSdpObserver("localSetRemoteDesc"), sd);
                        }
                        updateVideoViews(true);
                        localPeer.createAnswer(new CustomSdpObserver("remoteCreateOffer") {
                            @Override
                            public void onCreateSuccess(SessionDescription sessionDescription) {
                                //remote answer generated. Now set it as local desc for remote peer and remote desc for local peer.
                                super.onCreateSuccess(sessionDescription);
                                int flag = 1;
                                if(flag == 1) {
                                    localPeer.setLocalDescription(new CustomSdpObserver("localSetLocalDesc"), sessionDescription);
                                }
                                updateVideoViews(true);
                                // 전송

                                Rtcmsg.ToMessage.Builder tm = Rtcmsg.ToMessage.newBuilder();
                                Rtcmsg.IceCandidate.Builder ic = Rtcmsg.IceCandidate.newBuilder();
                                Rtcmsg.SessionDescription.Builder sd = Rtcmsg.SessionDescription.newBuilder();
                                sd.setDesc(sessionDescription.description);
                                sd.setOfferType(sessionDescription.type.toString().toLowerCase());
                                tm.setSdp(sd.build());
                                byte[] gg = tm.build().toByteArray();
                                mSocket.emit("offer", gg);

                            }
                        },new MediaConstraints());
                    }
                    else if(protoSd.getOfferType().equalsIgnoreCase("ANSWER")) {
                        sdt = SessionDescription.Type.ANSWER;
                        SessionDescription sd = new SessionDescription(sdt, protoSd.getDesc());
                        localPeer.setRemoteDescription(new CustomSdpObserver("localSetRemoteDesc"), sd);
                        updateVideoViews(true);
                    }
                    else if(protoSd.getOfferType().equals("PRANSWER")) {
                        sdt = SessionDescription.Type.PRANSWER;
                    }
                }
            } catch (InvalidProtocolBufferException e) {

                e.printStackTrace();
            }
        }
    };
    private int dpToPx(int dp) {
        DisplayMetrics displayMetrics = getResources().getDisplayMetrics(); // displayMetrics;
        return Math.round(dp * (displayMetrics.xdpi / DisplayMetrics.DENSITY_DEFAULT));
    }
    private void updateVideoViews(boolean v) {
//        runOnUiThread(new Runnable() {
//            @Override
//            public void run() {
//                ViewGroup.LayoutParams params = localVideoView.getLayoutParams();
//                if(v) {
//                    params.height = dpToPx(100);
//                    params.width = dpToPx(100);
//                }
//                else {
//                    params = new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT);
//
//                }
//                localVideoView.setLayoutParams(params);
//            }
//        });
    }
    private void call() {
//        start.setEnabled(false);
//        call.setEnabled(false);
        hangup.setEnabled(true);
        //we already have video and audio tracks. Now create peerconnections

        //creating Offer
        localPeer.createOffer(new CustomSdpObserver("localCreateOffer"){
            @Override
            public void onCreateSuccess(SessionDescription sessionDescription) {
                //we have localOffer. Set it as local desc for localpeer and remote desc for remote peer.
                //try to create answer from the remote peer.
                //
                super.onCreateSuccess(sessionDescription);

                ////////
                int flag = 1;
                if(flag == 1) {
                    localPeer.setLocalDescription(new CustomSdpObserver("localSetLocalDesc"), sessionDescription);
                }
                updateVideoViews(true);
                // 전송
                Rtcmsg.ToMessage.Builder tm = Rtcmsg.ToMessage.newBuilder();
                Rtcmsg.IceCandidate.Builder ic = Rtcmsg.IceCandidate.newBuilder();
                Rtcmsg.SessionDescription.Builder sd = Rtcmsg.SessionDescription.newBuilder();
                sd.setDesc(sessionDescription.description);
                sd.setOfferType(sessionDescription.type.toString().toLowerCase());
                tm.setSdp(sd.build());
                byte[] gg = tm.build().toByteArray();
                mSocket.emit("offer", gg);
            }
        },sdpConstraints);
    }


    private void hangup() {
        localPeer.close();
        localPeer = null;
        start.setEnabled(true);
        call.setEnabled(false);
        hangup.setEnabled(false);
    }

    private void gotRemoteStream(MediaStream stream) {
        //we have remote video stream. add to the renderer.
        final VideoTrack videoTrack = stream.videoTracks.get(0);
        AudioTrack audioTrack = stream.audioTracks.get(0);
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    remoteRenderer = new VideoRenderer(remoteVideoView);
                    remoteVideoView.setVisibility(View.VISIBLE);
                    videoTrack.addRenderer(remoteRenderer);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        });

    }


    public void onIceCandidateReceived(PeerConnection peer, IceCandidate iceCandidate) {
        //we have received ice candidate. We can set it to the other peer.
        Rtcmsg.ToMessage.Builder tm = Rtcmsg.ToMessage.newBuilder();
        Rtcmsg.IceCandidate.Builder ic = Rtcmsg.IceCandidate.newBuilder();
        ic.setSdp(iceCandidate.sdp);
        ic.setSdpMid(iceCandidate.sdpMid);
        ic.setServerUrl(iceCandidate.serverUrl);
        ic.setSdpMLineIndex(iceCandidate.sdpMLineIndex);
        tm.setIce(ic.build());
        byte[] gg = tm.build().toByteArray();
        mSocket.emit("offer", gg);
    }
}

