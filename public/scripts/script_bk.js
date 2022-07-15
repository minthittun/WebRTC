
var localVideo;
//var actorVideo;
var firstPerson = false;
var socketCount = 0;
var socketId;
var localStream;
var connections = [];
var socketIdList = [];
var capturedPhotos = [];

var audioInputSelect;
var audioOutputSelect;
var videoSelect;
var selectors;


var peerConnectionConfig = {
    iceServers: [
        {   
            urls: [ "stun:ss-turn2.xirsys.com" ]
        }, 
        {   
            username: "VMcunGJLz-uj8_6ofCvlSWfqLeBoeNi7Wz_TaV72ENEwpBpK4gm_3Jf5Z1fNDAt4AAAAAF6W1mBtaW50aGl0dHVu",   
            credential: "09a382f4-7efd-11ea-acac-322c48b34491",   
            urls: [       
                "turn:ss-turn2.xirsys.com:80?transport=udp",       
                "turn:ss-turn2.xirsys.com:3478?transport=udp",       
                "turn:ss-turn2.xirsys.com:80?transport=tcp",       
                "turn:ss-turn2.xirsys.com:3478?transport=tcp",       
                "turns:ss-turn2.xirsys.com:443?transport=tcp",      
                "turns:ss-turn2.xirsys.com:5349?transport=tcp"   
            ]
        }
    ]
};

GetRTCPeerConnection();
GetRTCSessionDescription();
GetRTCIceCandidate();



function pageReady() {

    localVideo = document.getElementById('localVideo');
    //actorVideo = document.getElementById('actorVideo');

    //Select devices
    audioInputSelect = document.querySelector('select#audioSource');
    audioOutputSelect = document.querySelector('select#audioOutput');
    videoSelect = document.querySelector('select#videoSource');
    selectors = [audioInputSelect, audioOutputSelect, videoSelect];

    videoSelect.onchange = changeDevices;
    audioInputSelect.onchange = changeDevices;
    audioOutputSelect.onchange = changeDevices;

    //Select devices

    var constraints = {
        video: true,
        audio: true,
    };

    if(navigator.mediaDevices.getUserMedia) {

        navigator.mediaDevices.enumerateDevices().then(function(deviceInfos) {
            
            // Handles being called several times to update labels. Preserve values.
            const values = selectors.map(select => select.value);
            selectors.forEach(select => {
                while (select.firstChild) {
                select.removeChild(select.firstChild);
                }
            });
            for (let i = 0; i !== deviceInfos.length; ++i) {
                const deviceInfo = deviceInfos[i];
                const option = document.createElement('option');
                option.value = deviceInfo.deviceId;
                if (deviceInfo.kind === 'audioinput') {
                    option.text = deviceInfo.label || `microphone ${audioInputSelect.length + 1}`;
                    audioInputSelect.appendChild(option);
                } else if (deviceInfo.kind === 'audiooutput') {
                    option.text = deviceInfo.label || `speaker ${audioOutputSelect.length + 1}`;
                    audioOutputSelect.appendChild(option);
                } else if (deviceInfo.kind === 'videoinput') {
                    option.text = deviceInfo.label || `camera ${videoSelect.length + 1}`;
                    videoSelect.appendChild(option);
                } else {
                    console.log('Some other kind of source/device: ', deviceInfo);
                }
            }
            selectors.forEach((select, selectorIndex) => {
                if (Array.prototype.slice.call(select.childNodes).some(n => n.value === values[selectorIndex])) {
                select.value = values[selectorIndex];
                }
            });
                    
        });

        navigator.mediaDevices.getUserMedia(constraints)
            .then(getUserMediaSuccess)
            .then(function(){

                socket = io.connect();
                
                socket.on('signal', gotMessageFromServer);    

                socket.on('connect', function(){

                    socketId = socket.io.engine.id;

                    socket.on('user-left', function(id, count){
                        var video = document.querySelector('[data-socket="'+ id +'"]');
                        var parentDiv = video.parentElement;
                        video.parentElement.parentElement.removeChild(parentDiv);

                        //Change width, height
                        var divider = 0;
                        count = (count - 1)

                        if(isDesktop())
                        {
                            if(count == 1){

                            divider = 1
                            width = 100;
                            height = 100;

                            }
                            else if(count == 2){

                            divider = 2
                            width = 100/divider;
                            height = 100;

                            }
                            else if(count == 3 || count == 4){

                            divider = 2
                            width = 100/divider;
                            height = 100/divider;

                            } 
                            else if(count == 5 || count == 6){

                            divider = 3
                            width = 100/divider;
                            height = 100/(divider-1);

                            } 
                        }
                        else
                        {
                            if(count == 1){

                            divider = 1
                            width = 100;
                            height = 100;

                            }
                            else if(count == 2){

                            divider = 2
                            width = 100;
                            height = 100/divider;

                            }
                            else if(count == 3 || count == 4){

                            divider = 2
                            width = 100/divider;
                            height = 100/divider;

                            } 
                            else if(count == 5 || count == 6){

                            divider = 3
                            width = 100/(divider-1);
                            height = 100/divider;

                            } 
                        }
                        //Change width, height

                        
                        var x = document.getElementById("videosContainer");
                        var y = x.getElementsByClassName("children");

                        for(var v = 0; v<y.length; v++){

                            y[v].style.width = width + "%";
                            y[v].style.height = height + "%";

                            
                            if(count == 3){
                                if(v == (count-1)){
                                    y[v].style.marginLeft = (width/2) +"%";
                                }
                            }
                            else if(count == 5)
                            {
                                if(isDesktop())
                                {
                                    if(v == (count-2)){
                                        y[v].style.marginLeft = (width/2) +"%";
                                    }
                                }
                                else
                                {
                                    if(v == (count-1)){
                                        y[v].style.marginLeft = (width/2) +"%";
                                    }
                                }
                            }
                            else{

                                y[v].style.marginLeft = 0;
                    
                            }
                            

                        }
                        //Change width, height

                        //actorVideo.srcObject = null;
                    });

                    socket.on('user-joined', function(id, count, clients){
                        socketIdList = clients;
                        clients.forEach(function(socketListId) {
                            if(!connections[socketListId]){
                                connections[socketListId] = new window.RTCPeerConnection(peerConnectionConfig);
                                //Wait for their ice candidate       
                                connections[socketListId].onicecandidate = function(event){
                                    if(event.candidate != null) {
                                        console.log('SENDING ICE');
                                        socket.emit('signal', socketListId, JSON.stringify({'ice': event.candidate}));
                                    }
                                }

                                //Wait for their video stream
                                connections[socketListId].onaddstream = function(event){
                                    gotRemoteStream(event, socketListId, count)
                                }    

                                //Add the local video stream
                                connections[socketListId].addStream(localStream);     
                                
                                
                            }
                        });

                        //Create an offer to connect with your local description
                        
                        if(count >= 2){
                            connections[id].createOffer().then(function(description){
                                connections[id].setLocalDescription(description).then(function() {
                                    // console.log(connections);
                                    socket.emit('signal', id, JSON.stringify({'sdp': connections[id].localDescription}));
                                }).catch(e => console.log(e));        
                            });
                        }
                    });  

                })       
        
            }); 
    } 
    else {
        alert('Your browser does not support getUserMedia API');
    } 

}

//Change devices
function changeDevices(){
    
    localStream.getTracks().forEach(function(track) {
        track.stop();
     });
     
     const audioSource = audioInputSelect.value;
     const videoSource = videoSelect.value;

     const constraints = {
        audio: {deviceId: audioSource ? {exact: audioSource} : undefined},
        video: {deviceId: videoSource ? {exact: videoSource} : undefined}
      };

    navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
        
        replaceTracks(stream);
        
    }).catch(function(error) {
        
    });
    
}

function replaceTracks(newStream){
    
    detachMediaStream("localVideo");   
  
    newStream.getTracks().forEach(function(track) {
       localStream.addTrack(track);
    });
  
    attachMediaStream("localVideo", newStream);
  
    //Replace track for active peer connections:
    socketIdList.forEach(function(socket){
        connections[socket].getSenders().map(function(sender) {
            sender.replaceTrack(newStream.getTracks().find(function(track) {
                return track.kind === sender.track.kind;
            }));
        });
    });
    
    
  }

  detachMediaStream = function(id) {
    
    var elem = document.getElementById(id);
  
    if (elem) {
      elem.pause();
  
      if (typeof elem.srcObject === 'object') {
          elem.srcObject = null;
      } else {
          elem.src = '';
      }
    }
  };
  
  attachMediaStream = function(id, stream) {
    var elem = document.getElementById(id);
  
    if (elem) {
      if (typeof elem.srcObject === 'object') {
          elem.srcObject = stream;
      } else {
          elem.src = window.URL.createObjectURL(stream);
      }
  
      elem.onloadedmetadata = function(e) {
          elem.play();
      };
    } else {
      throw new Error('Unable to attach media stream');
    }
  };
  
//Change devices

//Audio mute control
function muteChange() {
    
    var mute_control = document.getElementById('mute_control');
    
    if(mute_control.checked)
    {
        audioOn();
    }
    else
    {
        audioOff();
    }

}

function audioOn() {
    localStream.getAudioTracks()[0].enabled = true;
}

function audioOff() {
    localStream.getAudioTracks()[0].enabled = false
}
//Audio mute control

//Audio mute control
function videoChange() {
    
    var video_control = document.getElementById('video_control');
    
    if(video_control.checked)
    {
        videoOn();
    }
    else
    {
        videoOff();
    }

}

function videoOn() {
    localStream.getVideoTracks()[0].enabled = true;
}

function videoOff() {
    localStream.getVideoTracks()[0].enabled = false
}
//Video mute control

//Recording control
/*
function recordChange(){

    var record_control = document.getElementById('record_control');

    if(record_control.checked)
    {
        recordVideo();
    }
    else
    {
        stopRecordVideo();
    }

}

function recordVideo(){

}

async function stopRecordVideo(){
    
}
*/
//Recording control

//Screen capture
function screenCapture() {
    
    /*
    if(actorVideo.srcObject != null) {

        let ratio = actorVideo.videoWidth/actorVideo.videoHeight;
        let myWidth = actorVideo.videoWidth-100;
        let myHeight = parseInt(myWidth/ratio,10);

        let canvas = document.createElement("canvas");
        let context = canvas.getContext('2d');
        canvas.width = myWidth;
        canvas.height = myHeight;

        context.fillRect(0, 0, myWidth, myHeight);
        context.drawImage(actorVideo, 0, 0, myWidth, myHeight);

        var dataURL = canvas.toDataURL('image/png');
        capturedPhotos.push(dataURL);
        
        console.log(capturedPhotos.length)
        //document.getElementById("captured_count").innerHTML = capturedPhotos.length;
        //showCapturedPhotos();
        
    }
    */
}
//Screen capture

function showCapturedPhotos(){

    $("#capturedPhotoList").empty();
    capturedPhotos.forEach(function(photo){
        
        $("#capturedPhotoList").append("<img src = \""+photo+"\" style = \"height: 100%;\" />");

    });

}

function getUserMediaSuccess(stream) {

    localStream = stream;
    localVideo.srcObject = localStream;

    //Voice detection
    /*
    var options = {};
    var speechEvents = hark(localStream, options);

    speechEvents.on('speaking', function () {
        //localVideo.style.border = "2px solid #69E781";
        actorVideo.srcObject = localVideo.srcObject;
    });

    speechEvents.on('stopped_speaking', function () {
        //localVideo.style.border = "2px solid #555555";
        //actorVideo.srcObject = null;
    });
    */
    //Voice detection

}


function gotRemoteStream(event, id, count) {

    var videos = document.querySelectorAll('video'),
        video  = document.createElement('video'),
        div    = document.createElement('div')

    video.setAttribute('data-socket', id);
    video.srcObject = event.stream
    video.autoplay = true; 
    video.playsinline = true;
            
    //Change width, height
    var divider = 0;
    count = (count - 1)

    if(isDesktop())
    {
        if(count == 1){

        divider = 1
        width = 100;
        height = 100;

        }
        else if(count == 2){

        divider = 2
        width = 100/divider;
        height = 100;

        }
        else if(count == 3 || count == 4){

        divider = 2
        width = 100/divider;
        height = 100/divider;

        } 
        else if(count == 5 || count == 6){

        divider = 3
        width = 100/divider;
        height = 100/(divider-1);

        } 
    }
    else
    {
        if(count == 1){

        divider = 1
        width = 100;
        height = 100;

        }
        else if(count == 2){

        divider = 2
        width = 100;
        height = 100/divider;

        }
        else if(count == 3 || count == 4){

        divider = 2
        width = 100/divider;
        height = 100/divider;

        } 
        else if(count == 5 || count == 6){

        divider = 3
        width = 100/(divider-1);
        height = 100/divider;

        } 
    }
    //Change width, height

    div.setAttribute("class", "children");

    div.appendChild(video);      
    document.querySelector('#videosContainer').appendChild(div);      
    
    //Change width, height
    var x = document.getElementById("videosContainer");
    var y = x.getElementsByClassName("children");

    for(var v = 0; v<y.length; v++){

        y[v].style.width = width + "%";
        y[v].style.height = height + "%";

        
        if(count == 3){
            if(v == (count-1)){
                y[v].style.marginLeft = (width/2) +"%";
            }
        }
        else if(count == 5)
        {
            if(isDesktop())
            {
                if(v == (count-2)){
                    y[v].style.marginLeft = (width/2) +"%";
                }
            }
            else
            {
                if(v == (count-1)){
                    y[v].style.marginLeft = (width/2) +"%";
                }
            }
            
        }
        else{

            y[v].style.marginLeft = 0;

        }
        

    }
    //Change width, height

    //Voice detection
    
    var options = {};
    var speechEvents = hark(event.stream, options);

    speechEvents.on('speaking', function () {
        
        var video = document.querySelector('[data-socket="'+ id +'"]');
        video.classList.add("activeChildren")
        //div.classList.add("activeChildren");

        //actorVideo.srcObject = video.srcObject;

    });

    speechEvents.on('stopped_speaking', function () {
        
        var video = document.querySelector('[data-socket="'+ id +'"]');
        video.classList.remove("activeChildren")
        //div.classList.remove("activeChildren")
        
        //actorVideo.srcObject = null;
    });
    
    //Voice detection

}

function isDesktop()
{
    if($(document).width() > $(document).height())
    {
        return true;
    }
    else
    {
        return false;
    }
}


function gotMessageFromServer(fromId, message) {
    //Parse the incoming signal
    var signal = JSON.parse(message)

    //Make sure it's not coming from yourself
    if(fromId != socketId) {

        if(signal.sdp){            

            connections[fromId].setRemoteDescription(new window.RTCSessionDescription(signal.sdp)).then(function() {                
                if(signal.sdp.type == 'offer') {
                    connections[fromId].createAnswer().then(function(description){
                        
                        //
                        //

                        connections[fromId].setLocalDescription(description).then(function() {
                            
                            socket.emit('signal', fromId, JSON.stringify({'sdp': connections[fromId].localDescription}));
                        
                        
                        
                        }).catch(e => console.log(e));        
                    }).catch(e => console.log(e));
                }
            }).catch(e => console.log(e));

        }
    
        if(signal.ice) {
            connections[fromId].addIceCandidate(new window.RTCIceCandidate(signal.ice)).catch(e => console.log(e));
        }                
    }
}


function GetRTCIceCandidate() {
    window.RTCIceCandidate = window.RTCIceCandidate || window.webkitRTCIceCandidate ||
        window.mozRTCIceCandidate || window.msRTCIceCandidate;

    return window.RTCIceCandidate;
}

function GetRTCPeerConnection() {
    window.RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection ||
        window.mozRTCPeerConnection || window.msRTCPeerConnection;
    return window.RTCPeerConnection;
}

function GetRTCSessionDescription() {
    window.RTCSessionDescription = window.RTCSessionDescription || window.webkitRTCSessionDescription ||
        window.mozRTCSessionDescription || window.msRTCSessionDescription;
    return window.RTCSessionDescription;
}
