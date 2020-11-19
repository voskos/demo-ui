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

function App() {
  const [v, sV] = useState([])
  const [u_id, setUid] = useState("")
  const [f, SetF] = useState(0)

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

    // connect audio / video
    pc.ontrack = ({transceiver}) => {
        // console.log(video_sender.track, audio_sender.track)
        // console.log(video_rcvr.track, audio_rcvr.track)
        console.log("*****************************")
        console.log(transceiver)
        if (transceiver.receiver.track.kind == 'video'){
          // var video = document.createElement('video');
          // video.width = '600px'
          // video.height = '700px'
          // video.srcObject = new MediaStream([transceiver.receiver.track]);
          // video.autoplay = true;
          // let t = v
          // t.push(video)
          // sV(t)
          if(localStorage.uid !== "C"){
            document.getElementById('video').srcObject = new MediaStream([transceiver.receiver.track]);
          }
          else{
            console.log("2ND VIDEO FRAMEEEEEEEEEEE")
            document.getElementById('video1').srcObject = new MediaStream([transceiver.receiver.track]);
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

function negotiate() {
    return pc.createOffer().then(function(offer) {
        console.log("LOCAL ------", offer)
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
        
        connection.send(JSON.stringify({'action' : 'INIT','user_id' : $("#uname").val(), 'sdp' : pc.localDescription, 'room_id' : "ROOM-001"}))
        //console.log("SDP ANSWER FROM SERVER---> ", answer)
    })
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
      stream.getTracks().forEach(function(track) {
          
          if(track.kind == "video"){
            pc.addTrack(track);
            //video_sender.replaceTrack(track)
          }
          else{
            pc.addTrack(track);
            //audio_sender.replaceTrack(track)
          }
          
      });

      return negotiate();

  }, function(err) {
      alert('Could not acquire media: ' + err);
  });
} 

useEffect(() => {    
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
    console.log('Echo response from server: ' + e.data);
    let resp = JSON.parse(e.data)
    if(resp.action === "SERVER_ANSWER"){
      pc.setRemoteDescription(resp.sdp)
    }
    else if(resp.action === "SERVER_OFFER"){
      await pc.setRemoteDescription(resp.sdp)
      let ans = await pc.createAnswer()
      await pc.setLocalDescription(ans)
      connection.send(JSON.stringify({'action' : 'CLIENT_ANSWER','user_id' : $("#uname").val(), 'sdp' : pc.localDescription}))
    }
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
        <video id="video" autoPlay={true} width="1000px"></video>
        <video id="video1" autoPlay={true} width="1000px"></video>
        <div> 
           <div> 
              <input id = "uname" type = "text" placeholder = "username to call" /> 
              <button id = "callBtn" onClick={startCall}>Call</button> 
              <button id = "hangUpBtn" class = "btn-danger btn">Hang Up</button> 
           </div> 
        </div> 
      
     </div>
    </div>
  );
}

export default App;
