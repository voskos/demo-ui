import logo from './logo.svg';
import './App.css';
import $ from 'jquery';
import axios from 'axios'
import NATS from 'nats';
import React, { useState, useEffect } from 'react';
import {connect, NatsConnectionOptions, Payload} from 'ts-nats';

// peer connection
var pc = null;
var connection = null;
var audioTrack = null;
var videoTrack = null;
var displayStreamId = null;
var displayMediaSender = null

function App() {
  const [v, sV] = useState([])
  const [u_id, setUid] = useState("")

  function createPeerConnection() {
    var config = {
        sdpSemantics: 'unified-plan'
    };

    //config.iceServers = [{urls: ['stun:stun.l.google.com:19302']}];

    pc = new RTCPeerConnection(config);

    pc.addEventListener('icegatheringstatechange', function() {
        console.log(pc.iceGatheringState)
    }, false);

    pc.addEventListener('iceconnectionstatechange', function() {
        console.log( pc.iceConnectionState)
    }, false);

    pc.addEventListener('signalingstatechange', function() {
        console.log(pc.signalingState)
    }, false);

    // pc.addEventListener('icecandidate', async function({candidate}) {
    //     console.log("candidate ", candidate)
    //     await connection.send(JSON.stringify({'action' : 'NEW_ICE_CANDIDATE_CLIENT','user_id' : $("#uname").val(), 'ice_candidate' : candidate, 'room_id' : $("#room_id").val()}))
    // }, false);

    // connect audio / video
    pc.ontrack = ({transceiver, streams: [stream]}) => {
      console.log(pc.getTransceivers())
      console.log(stream)
        // console.log(video_sender.track, audio_sender.track)
        // console.log(video_rcvr.track, audio_rcvr.track)
        console.log("*****************************")
        //console.log(transceiver)

        // transceiver.receiver.track.onmute = (e) =>{
        //   console.log("Remote peer muted his track")
        // }


        if (transceiver.receiver.track.kind == 'video'){
          // var video = document.createElement('video');
          // video.width = '600px'
          // video.height = '700px'
          // video.srcObject = new MediaStream([transceiver.receiver.track]);
          // video.autoplay = true;
          // let t = v
          // t.push(video)
          // sV(t)
          if(stream.id.split("-")[1] === "webcamVideo"){
            document.getElementById('video').srcObject = stream
          }else if(stream.id.split("-")[1] === "displayVideo"){
            document.getElementById('screen').srcObject = stream
          }
          
          
          
          // if(flag == 1){
          //   flag = 2
          //   document.getElementById('video').srcObject = new MediaStream([transceiver.receiver.track]);
          // }
          // else{
          //   document.getElementById('video1').srcObject = new MediaStream([transceiver.receiver.track]);
          // }
          
        }
        else{
          document.getElementById('audio').srcObject = new MediaStream([transceiver.receiver.track]);
        }
        //     document.getElementById('video').srcObject = evt.streams[0];
        // else

          
    };

    return pc;
}

function negotiate(deviceType, streamId) {
    console.log("OWNERRRRRRRRRRRRRRRRR")
    console.log(pc.getTransceivers())
    return pc.createOffer().then(function(offer) {
        return pc.setLocalDescription(offer);
    }).then(function() {
        // wait for ICE gathering to complete
        return new Promise(function(resolve) {
            if (pc.iceGatheringState === 'complete') {
                resolve();
            } else {
                function checkState() {
                    if (pc.iceGatheringState === 'complete') {
                        pc.removeEventListener('icegatheringstatechange', checkState);
                        resolve();
                    }
                }
                pc.addEventListener('icegatheringstatechange', checkState);
            }
        });
    }).then(async function() {
      //await connection.send(JSON.stringify({'action' : 'SAVE_STREAM_ID_DEVICE_TYPE_INFO','user_id' : $("#uname").val(), 'room_id' : $("#room_id").val(), 'body' : {'stream_id' : streamId, 'device_type' : deviceType}}))

        if(deviceType === "webcam"){
          connection.send(JSON.stringify({'action' : 'INIT','user_id' : $("#uname").val(), 'sdp' : pc.localDescription, 'room_id' : $("#room_id").val(), 'body' : {'stream_id' : streamId, 'device_type' : deviceType}}))
        }else if(deviceType === "display"){
          connection.send(JSON.stringify({'action' : 'RENEGOTIATE_SCREEN','user_id' : $("#uname").val(), 'sdp' : pc.localDescription, 'room_id' : $("#room_id").val(), 'body' : {'stream_id' : streamId, 'device_type' : deviceType}}))
        }else if(deviceType === "display-stop"){
          connection.send(JSON.stringify({'action' : 'STOP_SCREEN_SHARE','user_id' : $("#uname").val(), 'sdp' : pc.localDescription, 'room_id' : $("#room_id").val(), 'body' : {'stream_id' : streamId, 'device_type' : deviceType}}))
        }
        
        //console.log("SDP ANSWER FROM SERVER---> ", answer)
    })
}

function toggleVideo(){
  videoTrack.enabled = !videoTrack.enabled
}

function toggleAudio(){
  audioTrack.enabled = !audioTrack.enabled
}


function startCall(){
  pc = createPeerConnection();
  localStorage.uid = $("#uname").val()
  // const t0 = pc.addTransceiver("video",{direction : 'sendrecv'} )
  // video_sender = t0.sender;
  // video_rcvr = t0.receiver;

  // const t1 = pc.addTransceiver("audio",{direction : 'sendrecv'} )
  // audio_sender = t1.sender;
  // audio_rcvr = t1.receiver;

  // pc.addTransceiver("audio",{direction : 'sendrecv'} )

  var constraints = {
        audio: true,
        video: true
  };
  navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
      console.log("Camera strem id", stream.id)
      stream.getTracks().forEach(function(track) {
          
          if(track.kind == "video"){
            videoTrack = track
            console.log("Track id video :-", track.id)
            pc.addTrack(track, stream);
            //video_sender.replaceTrack(track)
          }
          else{
            audioTrack = track
            console.log("Track id audio :-", track.id)
            pc.addTrack(track, stream);
            //audio_sender.replaceTrack(track)
          }
          
      });

      return negotiate("webcam", stream.id);

  }, function(err) {
      alert('Could not acquire media: ' + err);
  });
} 

function shareScreen(){
  if(pc === null){
     pc = createPeerConnection();
  }
  var constraints = {
        audio: true,
        video: true
  };
  navigator.mediaDevices.getDisplayMedia(constraints).then(function(stream) {
      stream.getTracks().forEach(function(track) {
          displayMediaSender = pc.addTrack(track, stream);
          
      });
      displayStreamId = stream.id
      return negotiate("display", stream.id);

  }, function(err) {
      alert('Could not acquire screen: ' + err);
  });
}

function stopScreenShare(){
  pc.removeTrack(displayMediaSender)
  return negotiate("display-stop", displayStreamId);
}

useEffect(() => {    

  navigator.mediaDevices.enumerateDevices()
  .then(function(devices) {
    devices.forEach(function(device) {
      console.log(device.kind + ": " + device.label +
                  " id = " + device.deviceId);
    });
  })
  .catch(function(err) {
    console.log(err.name + ": " + err.message);
  });




  localStorage.flag = 1
  if (window["WebSocket"]) {
  connection = new WebSocket('ws://localhost:8080/ws');
 
    // When the connection is open, send some data to the server
  connection.onopen = function () {
    console.log("Websocket connection created")
  };

  // Log errors
  connection.onerror = function (error) {
    console.log('WebSocket Error ', error);
  };

  // Log messages from the server
  connection.onmessage = async function (e) {
    let resp = JSON.parse(e.data)
    if(resp.action === "SERVER_ANSWER"){
      pc.setRemoteDescription(resp.sdp)
    }
    else if(resp.action === "SERVER_OFFER"){
      await pc.setRemoteDescription(resp.sdp)
      let ans = await pc.createAnswer()
      await pc.setLocalDescription(ans)
      connection.send(JSON.stringify({'action' : 'CLIENT_ANSWER','user_id' : $("#uname").val(), 'sdp' : pc.localDescription, 'room_id' : $("#room_id").val()}))
    }
    else if(resp.action === "STOP_SCREEN_SHARING"){
      console.log("Remote User ID ", resp.user_id)
      document.getElementById('screen').srcObject = null

    }
    // else if(resp.action === "NEW_ICE_CANDIDATE_SERVER"){
    //   if(pc.canTrickleIceCandidates){
    //     await pc.addIceCandidate(resp.ice_candidate);
    //   }
      
    // }
  };
  }
  else{
    console.log("")
  }

  


});
  return (
    <div className="App">
  
     <div id = "callPage"> 

        <audio id="audio" autoPlay={true}></audio>
        <video id="video" autoPlay={true} width="600px"></video>
        <video id="screen" autoPlay={true} width="600px"></video>
        <div> 
           <div> 
              <input id = "uname" type = "text" placeholder = "username to call" /> 
              <input id = "room_id" type = "text" placeholder = "Room ID" /> 
              
              <button id = "callBtn" onClick={startCall}>Call</button> 
              <button id = "hangUpBtn" onClick={toggleVideo} class = "btn-danger btn">Toggle Video</button> 
              <button id = "hangUpBtn" onClick={toggleAudio} class = "btn-danger btn">Toggle Audio</button> 

              <button id = "callBtn" onClick={shareScreen}>Share Screen</button> 
              //<button id = "callBtn" onClick={stopScreenShare}>Stop Screen</button> 
           </div> 
        </div> 
      
     </div>
    </div>
  );
}

export default App;
