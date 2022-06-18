import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Webcam from 'react-webcam';
import Spinner from 'react-bootstrap/Spinner';
import { Camera, CameraOptions } from '@mediapipe/camera_utils';
import { SelfieSegmentation } from '@mediapipe/selfie_segmentation';
import { Pose } from '@mediapipe/pose';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import styles from './Form.module.css';
import { poseDataScott, poseDataScottMirrored } from './data/poseDataScott.js';
import helpers from './form-helpers';

export default function Form() {
  
  const PAUSE_TIME = 3500; // ms to pause at end of video before looping
  const SPEECH_DELAY_TIME = 0.5; // delay in seconds for video
  const SPEECH_END_ITERATIONS = 10; // if no speech has been detected for 10 minutes, stop 
  const HEIGHT_WIDTH_RATIO = useRef(1.33); 

  const router = useRouter();

  const proVid = useRef(null);
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const landmarkCanvasRef = useRef(null);
  const errorCanvasRef = useRef(null);
  //const landmarkGridContainerRef = useRef(null);
  const progressBar = useRef(null);
  const pauseBar = useRef(null);
  const seekBar = useRef(null);
  const speechContainer = useRef(null);
  const speechText = useRef(null);
  const videoSpeedText = useRef(null);

  const [videoHeight, setVideoHeight] = useState(0);
  const [videoWidth, setVideoWidth] = useState(0);
  const [proSelection, setProSelection] = useState('eagle');
  const proData = useRef([...poseDataScott]);
  const [proOpacity, setProOpacity] = useState(50);
  const [proOrientation, setProOrientation] = useState(-1);
  const [camOpacity, setCamOpacity] = useState(100);
  const [camOrientation, setCamOrientation] = useState(-1);
  const [proRate, setProRate] = useState(50);
  const [stepped, setStepped] = useState(false);
  const [stepTime, setStepTime] = useState(5);
  const [seekWidth, setSeekWidth] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [numSpeechRestarts, setNumSpeechRestarts] = useState(0);
  const [webcamLoaded, setWebcamLoaded] = useState(false);
  const [webcamActive, setWebcamActive] = useState(false);
  const [loadingText, setLoadingText] = useState("Loading Video...");
  const resultsRecorded = useRef([]);
  const isPlayingBack = useRef(false);
  const [inPlayBack, setInPlayBack] = useState(false);
  const videoPlayStartTime = useRef(undefined);
  const resultsStartTime = useRef(undefined);
  const [inPauseTime, setInPauseTime] = useState(false);
  const isPausing = useRef(false);
  const [focusArea, setFocusArea] = useState('');
  const [camerasFound, setCamerasFound] = useState(undefined);
  const [camSelected, setCamSelected] = useState(undefined);
  const shouldUseMediaPipe = useRef(true);
  const playbackCounter = useRef(0);
  const proPlaybackCounter = useRef(0);
  const framePauseTimer = useRef(undefined);
  const [accuracyValue, setAccuracyValue] = useState(-1.0);
  const [videoConstraints, setVideoConstraints] = useState({facingMode: "user"});

  useEffect(()=> {
    // set the height of the webcam video to be equal to the height of the provideo after a delay of 2s

    setTimeout(() => {
      if (proVid.current) {
        setVideoHeight(proVid.current.scrollHeight);
        setVideoWidth(proVid.current.offsetWidth);
        //proVid.current.play();
        HEIGHT_WIDTH_RATIO.current = webcamRef.current.video.videoWidth / webcamRef.current.video.videoHeight;
      }
    }, 2000);

    let cams = navigator.mediaDevices.enumerateDevices().then(results => {
      let filtered = results.filter(device => device.kind == "videoinput");
      //console.log("cameras found: ", filtered);
      setCamerasFound(filtered);
    });

    if (proVid.current) {
      proVid.current.defaultPlaybackRate = 0.5;
    }
    
    // add listener to change the video height on resize
    window.addEventListener('resize', ()=> {
      setVideoHeight(proVid.current.scrollHeight);
      setVideoWidth(proVid.current.offsetWidth);
    })

    window.addEventListener('keydown', function(event) {
      event.preventDefault();
      const VID_FPS = proData.current.length / proVid.current.duration;
      const SINGLE_FRAME_TIME = 1/VID_FPS;
      let newTime = 0;

      switch (event.key) {
        case "ArrowLeft":
          // Left pressed
          newTime = proVid.current.currentTime - SINGLE_FRAME_TIME;
          if (newTime < 0) {
            proVid.current.currentTime = 0;
          } else {
            proVid.current.currentTime = proVid.current.currentTime - SINGLE_FRAME_TIME;
          }
          if (framePauseTimer.current != undefined) {
            clearTimeout(framePauseTimer.current);
            framePauseTimer.current = undefined;
          }
          break;
        case "ArrowRight":
          // Right pressed
          newTime = proVid.current.currentTime + SINGLE_FRAME_TIME;
          if (newTime > proVid.current.duration) {
            proVid.current.currentTime = proVid.current.duration;
          } else {
            proVid.current.currentTime = proVid.current.currentTime + SINGLE_FRAME_TIME;
          }
          if (framePauseTimer.current != undefined) {
            clearTimeout(framePauseTimer.current);
            framePauseTimer.current = undefined;
          }
          break;
        case " ":
          startOrStopVideo();
          break;
        //case "ArrowUp":
            // Up pressed
        //    break;
        //case "ArrowDown":
            // Down pressed
        //    break;
        }
    });

    proVid.current.addEventListener('ended', () => {
      handleVideoEnd();
    })

    proVid.current.addEventListener('play', () => {
      setInPauseTime(false);
      isPausing.current = false;
    });

    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return // required for FireFox -- speech API does not work

    //var SpeechGrammarList = window.SpeechGrammarList || window.webkitSpeechGrammarList;
    var SpeechRecognitionEvent = window.SpeechRecognitionEvent || window.webkitSpeechRecognitionEvent;

    var commands = [ 'play', 'stop', 'slow down', 'speed up', 'pause', 'start over', 'restart'];
    var grammar = '#JSGF V1.0; grammar commands; public <command> = ' + commands.join(' | ') + ' ;';

    var recognition = new SpeechRecognition();
    //var speechRecognitionList = new SpeechGrammarList();

    //speechRecognitionList.addFromString(grammar, 1);

    //recognition.grammars = speechRecognitionList;
    recognition.continuous = true;
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.start();

    recognition.onspeechstart = function() {
      setIsSpeaking(true);
    }

    recognition.onresult = function(event) {
      let isFinal = event.results[event.results.length-1].isFinal;
      if (isFinal) {
        // prevents duplicate results from registering
        return
      }
      let comm = event.results[event.results.length-1][0].transcript.trim().toLowerCase();
      speechText.current.innerText = comm;

      if (speechText.current.classList.contains(styles.fadeOutAnimation)) {
        speechText.current.classList.remove(styles.fadeOutAnimation);
      }

      setTimeout(() => {
        speechText.current.classList.add(styles.fadeOutAnimation);
      }, 3000);

      helpers.debounce(processSpeech(comm), 3000);

      //console.log('Confidence: ' + event.results[0][0].confidence);
      setIsSpeaking(false);
    }

    recognition.onspeechend = function() {
      console.log("speech stopped");

      if (numSpeechRestarts >= SPEECH_END_ITERATIONS) {
        // do not restart speech -- 10 minutes has passed without detection
        setNumSpeechRestarts(0);
        console.log("ending speech after 10 minutes");
        return
      }

      setTimeout(() => {
        if (!recognition) {
          recognition.start();
          setNumSpeechRestarts(numSpeechRestarts => numSpeechRestarts + 1);
        } else {
          console.log("speech object already found");
        }
      }, 400);
    }

    recognition.onnomatch = function(event) {
      console.log("I didn't recognize that command");
    }

    recognition.onerror = function(event) {
      //console.log('Error occurred in recognition: ' + event.error);
      setTimeout(() => {
        recognition.start();
      }, 400);
    }
  }, [])

  useEffect(() => {
    proVid.current.playbackRate = proRate / 100;
    videoSpeedText.current.innerText = proVid.current.playbackRate * 100 + "%";

    if (videoSpeedText.current.classList.contains(styles.fadeOutAnimation)) {
      videoSpeedText.current.classList.remove(styles.fadeOutAnimation);
    }

    setTimeout(() => {
      videoSpeedText.current.classList.add(styles.fadeOutAnimation);
    }, 3000);

  }, [proRate])

  const loadSegmentation = () => {

      if((navigator.userAgent.indexOf("Safari") != -1 || navigator.userAgent.indexOf("Firefox") != -1) && navigator.userAgent.indexOf("Chrome") == -1) {
        // safari does not properly load segmentation
        console.log("unsupported browser");
        //console.log("navigator.userAgent: ", navigator.userAgent);
        shouldUseMediaPipe.current = false;
        setWebcamLoaded(true);
        loadCamera();
        return
      }

      const canvasCtx = canvasRef.current.getContext('2d');
      let counter = 0;

      function onResults(results) {
        if (!results.poseLandmarks) {
          return;
        }
        if (isPlayingBack.current === true) return;

        drawSegmentedImageOnCanvas(canvasCtx, results, canvasRef.current);

        if (!proVid.current.paused) {
          if (resultsRecorded.current === []) {
            resultsStartTime.current = new Date();
          }
          resultsRecorded.current.push(results);
        } 

        counter++;
      }
      
      const pose = new Pose({locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
      }});
      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: true,
        smoothSegmentation: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });
      pose.onResults(onResults);
      
      var sendCounter = 0;
      let watchdogTimer = undefined;

      if (camera) {
        camera.stop();
      }

      const camera = new Camera(webcamRef.current.video, {
        onFrame: async () => {
          if (sendCounter === 1) {
            console.log("segmentation started");
            //console.log("webcamRef.current.video.style ", webcamRef.current.video.style);
            webcamRef.current.video.style.visibility = "hidden";
            setWebcamLoaded(true);
            if (watchdogTimer) {
              clearTimeout(watchdogTimer);
            }
          }
          if (sendCounter === 0) {
            watchdogTimer = setTimeout(() => {
              console.log("watchdog timer hit");
              camera.stop();
              shouldUseMediaPipe.current = false;
              setWebcamLoaded(true);
              // TODO: getting errors with webcamRef

            }, 120*1000);
            await pose.send({image: webcamRef.current.video});
          } 
          await pose.send({image: webcamRef.current.video});
          
          //console.log("after frame");
          if (sendCounter > 1) return
          sendCounter++;
        }
      });
      camera.start();
  }

  const loadCamera = () => {    
    let ctx = canvasRef.current.getContext('2d');

    console.log("loading camera");

    const camera = new Camera(webcamRef.current.video, {
      onFrame: async () => {
        await captureScreenshot();
      }
    });
    camera.start();

    webcamRef.current.video.style.visibility = "hidden";

    let X_OFFSET = 0;
    const captureScreenshot = () => {

      if (isPlayingBack.current === true) return;

      X_OFFSET = (canvasRef.current.width - 
        canvasRef.current.height*HEIGHT_WIDTH_RATIO.current) / 2; // centers the image in X without stretching

      ctx.save();
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      ctx.drawImage(webcamRef.current.video, X_OFFSET, 0, canvasRef.current.height*HEIGHT_WIDTH_RATIO.current, canvasRef.current.height);
      
      // TODO: Check if this is working
      let img = new Image();
      img.src = canvasRef.current.toDataURL();
      ctx.restore(); 
      if (!proVid.current.paused) {
        resultsRecorded.current.push({image: img});
      } 
    }
  }

  useEffect(() => {
    if (shouldUseMediaPipe.current === false) {
      /*if (webcamRef.current) {
        webcamRef.current.video.style.visibility = "visible";
      }*/
    }
  }, [webcamLoaded])

  const handleVideoEnd = () => {
    
    if (isPlayingBack.current == true) {
      setInPlayBack(false);
      isPlayingBack.current = false;
      setInPauseTime(true);
      isPausing.current = true;
      setFocusArea('');
      setAccuracyValue(-1.0);
      animatePauseBar();
    } else {
      isPlayingBack.current = true;
      setInPauseTime(false);
      isPausing.current = false;
      setInPlayBack(true);
      playbackRecording();
    }
  }

  const drawSegmentedImageOnCanvas = (ctx, data, refToCanvas) => {
    const X_OFFSET = (refToCanvas.width - 
      refToCanvas.height*HEIGHT_WIDTH_RATIO.current) / 2; // centers the image in X without stretching

    //console.log("refToCanvas.height*HEIGHT_WIDTH_RATIO: ", refToCanvas.height*HEIGHT_WIDTH_RATIO.current);
    //console.log("webcamRef.current.video.videoWidth: ", webcamRef.current.video.videoWidth);

    // TODO: This is squashing results horizontally when not using segmentation
    ctx.save();
    ctx.globalCompositeOperation = 'destination-atop';
    ctx.clearRect(0, 0, refToCanvas.width, refToCanvas.height);
    if (data.hasOwnProperty('segmentationMask')) {
      ctx.drawImage(data.image, X_OFFSET, 0, refToCanvas.height*HEIGHT_WIDTH_RATIO.current, refToCanvas.height);
      ctx.globalCompositeOperation = 'destination-in';
      ctx.drawImage(data.segmentationMask, X_OFFSET, 0, refToCanvas.height*HEIGHT_WIDTH_RATIO.current, refToCanvas.height);
    } else {
      ctx.drawImage(data.image, 0, 0, refToCanvas.width, refToCanvas.height);
    }
    ctx.restore();  
  }

  const playbackRecording = () => {

    // this function plays back what was recorded from the previous throw
    let playbackTimer = undefined;
    playbackCounter.current = 0;
    //const playbackFrameRate = 1000 / (proVid.current.playbackRate * 30); // ms for 1 frame every 30 sec

    // duration / playback rate == adjusted time (5.2 seconds)
    // resultsRecorded.length = # of frames
    // # of frames / number of seconds ==> frames/second
    // invert that for seconds/frame * 1000

    const currentPlaybackRate = proVid.current.playbackRate;
    const PLAYBACK_RATE = currentPlaybackRate / 2;

    //const playbackFrameRateTime = ((proVid.current.duration / proVid.current.playbackRate) / resultsRecorded.current.length ) * 1000;
    const playbackFrameRateTime = ((proVid.current.duration / PLAYBACK_RATE) / resultsRecorded.current.length ) * 1000;
    const playbackFPS = 1 / (playbackFrameRateTime / 1000);
    const canvasCtx = canvasRef.current.getContext('2d');

    const numProPoseFrames = proData.current.length;
    //const proVidFPS = numProPoseFrames / proVid.current.duration * proVid.current.playbackRate;
    const proVidFPS = numProPoseFrames / proVid.current.duration * PLAYBACK_RATE;
    const proVidFrameRateTime = (1 / proVidFPS) * 1000; // time in between frames, 1 / FPS
    proVid.current.playbackRate = PLAYBACK_RATE;

    // say playbackFPS = 42
    // proVidFPS = 30 
    // playbackRatio = 42/30 = 1.4;
    // playbackFrame[0] = proVidFrame[0]
    // playbackFrame[1] = (proVidFrame[1] - proVidFrame[0])/playbackRatio + proVidFrame[0]
    // playbackFrame[2] = proVidFrame[2/1.4] = proVidFrame[1.43]
    // proVidFrame[1] = playbackFrame[1*1.4] = playbackFrame[1.4];

    const playbackRatio = resultsRecorded.current.length / numProPoseFrames;

    let greatestDiffLandmark = '';
    let greatestDiffFrames = [];
    let diffFrames = [];
    let accuracyScore = 0.0;

    const LANDMARK_NAMES = [
      'Left Shoulder',
      'Right Shoulder',
      'Left Elbow',
      'Right Elbow',
      'Left Wrist',
      'Right Wrist',
      'Left Hip',
      'Right Hip',
      'Left Knee',
      'Right Knee',
      'Left Ankle',
      'Right Ankle',
    ]


    // set the video time back to zero
    proVid.current.currentTime = 0;
    proVid.current.play();

    let proPlaybackTimer = undefined;
    proPlaybackCounter.current = 0;

    const landmarkCtx = landmarkCanvasRef.current.getContext('2d');

    proVid.current.addEventListener('seeked', handleSeeked, true);

    const gridXStep = landmarkCanvasRef.current.width / numProPoseFrames;
    framePauseTimer.current = undefined;

    const errorCtx = errorCanvasRef.current.getContext('2d');

    if (resultsRecorded.current[0].hasOwnProperty('segmentationMask')) {
      // not just captured frame

      [greatestDiffLandmark, greatestDiffFrames, diffFrames, accuracyScore] = 
          helpers.findGreatestDifference(
              proData.current, 
              proVid.current.scrollHeight*(proVid.current.videoWidth/proVid.current.videoHeight),
              proVid.current.scrollHeight, 
              resultsRecorded.current, 
              proVid.current.scrollHeight*HEIGHT_WIDTH_RATIO.current, 
              playbackRatio);

      //console.log("accuracyScore: ", accuracyScore);
      setAccuracyValue(accuracyScore);

      if (greatestDiffLandmark === -1) {
        console.log("no diff landmark found");
      } else {
        let greatestDiffLandmarkName = LANDMARK_NAMES[greatestDiffLandmark];
        setFocusArea(greatestDiffLandmarkName);
        //console.log("greatestDiffLandmarkName: ", greatestDiffLandmarkName);
      }  

      // plots error chart on canvas
      
      errorCtx.lineWidth = 3;
      let grad = errorCtx.createLinearGradient(0, 0, 0, errorCanvasRef.current.height);
      grad.addColorStop(0, "red");
      grad.addColorStop(0.5, "yellow");
      grad.addColorStop(1, "green");
      errorCtx.strokeStyle = grad; //'#00FF00';

      errorCtx.beginPath();
      if (proOrientation === -1) {
        errorCtx.moveTo(Math.floor(errorCanvasRef.current.width-gridXStep), Math.floor(errorCanvasRef.current.height-diffFrames[0]/100*errorCanvasRef.current.height))
      } else {
        errorCtx.moveTo(Math.floor(gridXStep), Math.floor(errorCanvasRef.current.height-diffFrames[0]/100*errorCanvasRef.current.height))
      }
      
      for (let i = 1; i < proData.current.length; i++) {
        let chartX;
        if (proOrientation === -1) {
          chartX = Math.floor(errorCanvasRef.current.width - gridXStep*i)
        } else {
          chartX = Math.floor(gridXStep*i)
        }
        errorCtx.lineTo(chartX, Math.floor(errorCanvasRef.current.height-diffFrames[i]/100*errorCanvasRef.current.height))
        //console.log(Math.floor(gridXStep)*i + ", " + Math.floor(landmarkCanvasRef.current.height-diffFrames[i]/100*landmarkCanvasRef.current.height));
      }
      errorCtx.stroke();
    }


    // ---- play back the previous recorded form ----- //
    if (!playbackTimer) {
      playbackTimer = setInterval(() => {
        
        if (playbackCounter.current >= resultsRecorded.current.length || isPlayingBack.current === false) {
          //console.log("exiting playback");
          resultsRecorded.current = [];
          clearInterval(playbackTimer);
          canvasCtx.globalCompositeOperation = 'destination-atop';
          canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          proVid.current.playbackRate = currentPlaybackRate;
          proVid.current.removeEventListener('seeked', handleSeeked, true);
          return
        }

        drawSegmentedImageOnCanvas(canvasCtx, 
            resultsRecorded.current[playbackCounter.current], 
            canvasRef.current);
        
        if (proVid.current.paused === true) {
          return
        }

        playbackCounter.current++;

      }, playbackFrameRateTime)
    }

    
    // ----- play back the pro form, adding min/max box ----- //
    if (!proPlaybackTimer) {

      const BOX_PADDING = 10;
      let squashedCurrentResults = helpers.squashResults(proData.current, resultsRecorded.current, playbackRatio);

      proPlaybackTimer = setInterval(() => {
        if (proPlaybackCounter.current >= proData.current.length || isPlayingBack.current === false) {
          clearInterval(proPlaybackTimer);
          landmarkCtx.globalCompositeOperation = 'destination-atop';
          landmarkCtx.clearRect(0, 0, landmarkCanvasRef.current.width, landmarkCanvasRef.current.height);
          errorCtx.globalCompositeOperation = 'destination-atop';
          errorCtx.clearRect(0, 0, errorCanvasRef.current.width, errorCanvasRef.current.height);
          return
        }

        landmarkCtx.save();
        landmarkCtx.globalCompositeOperation = 'destination-atop';
        landmarkCtx.clearRect(0, 0, landmarkCanvasRef.current.width, landmarkCanvasRef.current.height);
        landmarkCtx.globalCompositeOperation = 'source-over';

        if (shouldUseMediaPipe.current === true) {

          if (squashedCurrentResults[proPlaybackCounter.current][greatestDiffLandmark] && proData.current[proPlaybackCounter.current][greatestDiffLandmark]) {
            //let youOffset = (landmarkCanvasRef.current.width-webcamRef.current.video.videoWidth)/2;
            let youWidth = landmarkCanvasRef.current.height*HEIGHT_WIDTH_RATIO.current;
            let youOffset = (landmarkCanvasRef.current.width-youWidth)/2;

            let proWidth = proVid.current.scrollHeight*proVid.current.videoWidth/proVid.current.videoHeight;
            let proOffset = (landmarkCanvasRef.current.width-proWidth)/2;

            // pose estimation has run and computed results
            let minX = Math.min(squashedCurrentResults[proPlaybackCounter.current][greatestDiffLandmark].x*youWidth + youOffset, proData.current[proPlaybackCounter.current][greatestDiffLandmark].x*proWidth + proOffset);
            let maxX = Math.max(squashedCurrentResults[proPlaybackCounter.current][greatestDiffLandmark].x*youWidth + youOffset, proData.current[proPlaybackCounter.current][greatestDiffLandmark].x*proWidth + proOffset);
            let minY = Math.min(squashedCurrentResults[proPlaybackCounter.current][greatestDiffLandmark].y*landmarkCanvasRef.current.height, proData.current[proPlaybackCounter.current][greatestDiffLandmark].y*landmarkCanvasRef.current.height);
            let maxY = Math.max(squashedCurrentResults[proPlaybackCounter.current][greatestDiffLandmark].y*landmarkCanvasRef.current.height, proData.current[proPlaybackCounter.current][greatestDiffLandmark].y*landmarkCanvasRef.current.height);

            let boxX = minX - BOX_PADDING;
            let boxY = minY - BOX_PADDING;
            let boxWidth = (maxX - minX) + BOX_PADDING;
            let boxHeight = (maxY - minY) + BOX_PADDING;

            
            for (let i = 0; i < squashedCurrentResults[proPlaybackCounter.current].length; i++) {
              // TODO: Test this for accuracy -- why 0.95?
              let youX = squashedCurrentResults[proPlaybackCounter.current][i].x*youWidth + youOffset;
              let youY = squashedCurrentResults[proPlaybackCounter.current][i].y*landmarkCanvasRef.current.height;
              let proX = proData.current[proPlaybackCounter.current][i].x*proWidth + proOffset;
              let proY = proData.current[proPlaybackCounter.current][i].y*landmarkCanvasRef.current.height;

              landmarkCtx.strokeStyle = 'red';
              landmarkCtx.lineWidth = 2;
              landmarkCtx.beginPath();
              landmarkCtx.moveTo(youX, youY);
              landmarkCtx.lineTo(proX, proY);
              landmarkCtx.stroke();

              landmarkCtx.strokeStyle = 'blue';
              landmarkCtx.fillStyle = 'blue';
              landmarkCtx.beginPath(); 
              landmarkCtx.arc(
                    youX,
                    youY,
                    5,
                    0,
                    2*Math.PI 
                )
              landmarkCtx.fill();

              landmarkCtx.strokeStyle = 'orange';
              landmarkCtx.fillStyle = 'orange';
              landmarkCtx.beginPath(); 
              landmarkCtx.arc(
                    proX,
                    proY,
                    5,
                    0,
                    2*Math.PI 
                )
              landmarkCtx.fill();
            }

            landmarkCtx.strokeStyle = '#00FF00';
            landmarkCtx.lineWidth = 5;
            landmarkCtx.strokeRect(boxX, boxY, boxWidth, boxHeight);
            landmarkCtx.beginPath();
            landmarkCtx.fillStyle = '#FF0000';
            landmarkCtx.arc(
                  squashedCurrentResults[proPlaybackCounter.current][greatestDiffLandmark].x*youWidth + youOffset,
                  squashedCurrentResults[proPlaybackCounter.current][greatestDiffLandmark].y*landmarkCanvasRef.current.height,
                  5,
                  0,
                  2*Math.PI 
              )
            landmarkCtx.fill();
            landmarkCtx.beginPath();
            landmarkCtx.fillStyle = '#FFFF00';
            landmarkCtx.arc(
                  proData.current[proPlaybackCounter.current][greatestDiffLandmark].x*landmarkCanvasRef.current.width,
                  proData.current[proPlaybackCounter.current][greatestDiffLandmark].y*landmarkCanvasRef.current.height,
                  5,
                  0,
                  2*Math.PI 
              )
              
            landmarkCtx.fill();

            landmarkCtx.beginPath();
            landmarkCtx.strokeStyle = '#CCCCCC';
            landmarkCtx.lineWidth = 1;
            
            let xLoc;
            if (proOrientation === -1) {
              xLoc = Math.floor(errorCanvasRef.current.width - gridXStep*proPlaybackCounter.current);
            } else {
              xLoc = Math.floor(gridXStep*proPlaybackCounter.current);
            }
            /*landmarkCtx.arc(
                xLoc, 
                Math.floor(landmarkCanvasRef.current.height-diffFrames[proPlaybackCounter.current]/100*landmarkCanvasRef.current.height),
                5,
                0,
                2*Math.PI);*/

            const LINE_LENGTH = 12;
            landmarkCtx.moveTo(
                xLoc, 
                Math.floor(landmarkCanvasRef.current.height-diffFrames[proPlaybackCounter.current]/100*landmarkCanvasRef.current.height)-LINE_LENGTH/2);
            landmarkCtx.lineTo(
                xLoc, 
                Math.floor(landmarkCanvasRef.current.height-diffFrames[proPlaybackCounter.current]/100*landmarkCanvasRef.current.height)+LINE_LENGTH/2);
            landmarkCtx.stroke();

            landmarkCtx.restore();


            // pause when greatest diff frame is reached
            if (greatestDiffFrames.includes(proPlaybackCounter.current)) {
              //console.log("pausing at frame: ", proPlaybackCounter.current);
              if (framePauseTimer.current === undefined) {
                if (!proVid.current.paused) {
                  proVid.current.pause();
                }
                framePauseTimer.current = setTimeout(() => {
                  proVid.current.play();
                }, 3000);
              }
              //console.log()
            }
          }
        }

        if (proVid.current.paused === true) {
          //console.log("video is paused");
          return
        }

        proPlaybackCounter.current++;
        framePauseTimer.current = undefined;
        //console.log("proPlaybackCounter.current: ", proPlaybackCounter.current);

      }, proVidFrameRateTime)
    }  
  }

  const handleSeeked = (e) => {
    // TODO: TEST THIS

    let ratioComplete = e.target.currentTime / e.target.duration;
    playbackCounter.current = Math.floor(ratioComplete * resultsRecorded.current.length);
    proPlaybackCounter.current = Math.floor(ratioComplete * proData.current.length);
  }

  const animatePauseBar = () => {

    proVid.current.currentTime = 0;

    let anim = pauseBar.current.animate([
      {transform: 'translateX(-100%)'},
      {transform: 'translateX(0%)'}
    ], {
      duration: PAUSE_TIME,
      iterations: 1
    });

    anim.addEventListener('finish', () => {
      proVid.current.play();
    })

    /*setTimeout(() => {
      if (proVid.current) {
        proVid.current.play();
      }
    }, PAUSE_TIME * proVid.current.playbackRate)*/
  }


  const processSpeech = (comm) => {
    switch(comm) {
      case('play'):
        proVid.current.play();
        break;
      case('pause'):
      case('stop'):
        if (!proVid.current.paused) {
          proVid.current.pause();
          backtrackVideo();
        }
        break;
      case('restart'):
      case('start over'):
        proVid.current.currentTime = 0;
        break;
      case('slow down'):
        helpers.debounce(slowDownVideo(), 300);
        break;
      case('speed up'):
        helpers.debounce(speedUpVideo(), 300);
        break;
      default:
        break;  
    }
  }

  const proRateChange = (e) => {
    let rate = e.target.value;
    setProRate(rate);
  }

  const slowDownVideo = () => {
    if (proVid.current.playbackRate > 0.0) {
      setProRate(proRate => proRate - 10);
    }
  }

  const speedUpVideo = () => {
    if (proVid.current.playbackRate < 1.0) {
      setProRate(proRate => proRate + 10);
    }
  }

  const backtrackVideo = () => {
    let currTime = proVid.current.currentTime;
    let backTime = currTime - SPEECH_DELAY_TIME*proRate/100; // convert from ms to s
    if (backTime < 0) {
      backTime = proVid.current.duration + backTime;
    }
    proVid.current.currentTime = backTime;
  }

  const proVidSourceChange = (e) => {
    setProSelection(e.target.value);
  }

  useEffect(() => {
    proVid.current.load();
    setSeekWidth(0);
    switch(proSelection) {
      case('scott'):
        if (proOrientation === -1) {
          proData.current = [...poseDataScott];
        } else {
          proData.current = [...poseDataScottMirrored];
        }
        break;
      default:
        proData.current = [...poseDataScott];
        break;
    }
  }, [proSelection, proOrientation])

  const seekClicked = (e) => {
    let offset = seekBar.current.offsetLeft;
    let left = (e.pageX - offset);
    let totalWidth = seekBar.current.getBoundingClientRect().width;
    let percentage = ( left / totalWidth );
    let vidTime = proVid.current.duration * percentage;
    proVid.current.currentTime = vidTime;
  }
  const videoTimeUpdate = () => {
    let percentage = ( proVid.current.currentTime / proVid.current.duration ) * 100;
    setSeekWidth(percentage);
  }

  const startOrStopVideo = () => {
    if (proVid.current.paused) {
      if (isPausing.current === true) {
        let anim = pauseBar.current.getAnimations();
        if (anim.length > 0) {
          if (anim[0].playState === 'running') {
            anim[0].pause();
          } else if (anim[0].playState === 'paused') {
            anim[0].play();
          }
        } 
      } else {
        proVid.current.play();
      }
    } else {
      proVid.current.pause();
    }
  }

  useEffect(() => {
    /*navigator.getUserMedia(function(stream) { 
      stream.getTracks()[0].stop();
    }, function(e) { 
      console.log("background error : " + e.name);
    }); */

    //console.log(navigator);

    if (camSelected) {
      setVideoConstraints({deviceId: {exact: camSelected}});
    } else {
      setVideoConstraints({facingMode: "user"});
    }
  }, [camSelected])

  useEffect(() => {
    //console.log("videoConstraints: ", videoConstraints);
  }, [videoConstraints])

  return (
    <div className={styles.container}>
      <div className={styles.instructionsContainer}>
        This app is designed for use on a large screen, i.e. laptop or computer with webcam. <br />
        Voice commands include: Play, Pause, Stop, Speed Up, Slow Down, Restart, and Start Over. <br />
        Please send feedback to: <a href="mailto: joelmasters@gmail.com">joelmasters@gmail.com</a>
      </div>
      <div className={styles.optionContainer}>
        {/*<select name="pro-select" 
                id="pro-select" 
                value={proSelection}
                onChange={proVidSourceChange}>
          <option value="eagle">Eagle McMahon (Backhand)</option>
          <option value="ricky">Ricky Wysocki (Backhand)</option>
          <option value="clemons">Chris Clemons (Forehand)</option>
      </select>*/}
        <table className={styles.optionsTable}>
          <tbody>
          <tr>
            <td className={styles.optionBlockLeft}>
              Pro Video Opacity
            </td>
            <td className={styles.optionBlockRight}>
              <input className={styles.optionBlock}
                    type="range" id="pro-vid-opacity" name="pro-vid-opacity" 
                    min="0" max="100" step="10"
                    value={proOpacity}
                    onChange={e => setProOpacity(e.target.value)} />
              <label htmlFor="pro-vid-opacity">{proOpacity}%</label>
            </td>
          </tr>
          <tr >
            <td className={styles.optionBlockLeft}>
              Your Video Opacity
            </td>
            <td className={styles.optionBlockRight}>          
              <input className={styles.optionBlock}
                    type="range" 
                    id="cam-vid-opacity" 
                    name="cam-vid-opacity" 
                    min="0" max="100" step="10"
                    value={camOpacity}
                    onChange={e => setCamOpacity(e.target.value)} />
              <label htmlFor="cam-vid-opacity">{camOpacity}%</label>
            </td>
          </tr>
          <tr>
            <td className={styles.optionBlockLeft}>
              Video Speed 
            </td>
            <td className={styles.optionBlockRight}>
              <input className={styles.optionBlock}
                    type="range" 
                    id="pro-rate" 
                    name="pro-rate" 
                    min="0" max="100" step="10"
                    value={proRate}
                    onChange={proRateChange} />
              <label htmlFor="pro-rate">{proRate}%</label>
            </td>
          </tr>
          <tr>
            <td
                className={styles.buttonCell}
                >
              <button className={styles.buttonFlip}
                  onClick={() => setProOrientation(proOrientation === 1 ? -1 : 1)}>Flip Pro</button>
            </td>
            <td
                className={styles.buttonCell}
                style={{textAlign: 'left'}}
                >
              <button className={styles.buttonFlip}
                  onClick={() => setCamOrientation(camOrientation === 1 ? -1 : 1)}>Flip Cam</button>
            </td>
          </tr>
          {/*<tr>
            <td>
              {camerasFound && camerasFound.length > 1 ? camerasFound.map(
                (cam, idx) => 
                  <button key={cam.deviceId || idx} 
                          className={styles.camButton}
                          onClick={() => setCamSelected(cam.deviceId)}
                          >
                    {"Cam " + (idx + 1).toString()}
                  </button>
              ) : '' }
            </td>
          </tr>*/}
      </tbody>
      </table>
      </div>
      <div className={styles.videoContainer}>
        {webcamLoaded == true ? '' :
          <div role="status" className={styles.loadingSpinner}>
            <Spinner
              as="span"
              animation="grow"
              size="sm"
              role="status"
              aria-hidden="true"
            />
            &nbsp;<span>{loadingText}</span>
          </div>
        }
        <div className={styles.screenBlocker}
             onClick={startOrStopVideo}>
        </div>
        <div className={styles.playbackText}>
          { inPlayBack ? 'Playback' : '' }
        </div>
        {focusArea === '' ? '' : 
          <div className={styles.focusAreaText}>
            {focusArea}
          </div>
        }
        {accuracyValue === -1.0 ? '' : 
          <div className={styles.accuracyText}>
            {`Score: ${Math.round(accuracyValue*100)}%`}
          </div>
        }
        <div className={styles.videoSpeedText} 
             ref={videoSpeedText}
             onAnimationEnd={() => 
                {
                  videoSpeedText.current.classList.remove(styles.fadeOutAnimation);
                  videoSpeedText.current.innerText = '';
                }
              }
             >
        </div>
        <div className={styles.webcamContainer}
             style={{
                opacity:camOpacity + '%',
                transform: 'scaleX('+camOrientation+')',
               }}>
          <Webcam 
              className={styles.webcam}
              ref={webcamRef}
              audio={false}
              height={videoHeight}
              videoConstraints={videoConstraints} //{{facingMode: "user", deviceId: camSelected }}
              onUserMedia={() => {
                console.log('connected to user media'); 
                loadSegmentation(); 
                setWebcamActive(true);
                setLoadingText("Loading segmentation...");
              }}
              onUserMediaError={(e) => {
                console.log('unable to connect to user media (camera)', e);
                setWebcamLoaded(true);
              }}
            />
          <canvas 
            className={styles.outputCanvas}
            ref={canvasRef}
            width={videoWidth}
            height={videoHeight}>  
          </canvas>
          <canvas
            className={styles.outputCanvas}
            ref={landmarkCanvasRef}
            width={videoWidth}
            height={videoHeight}>
          </canvas>
          <canvas
            className={styles.outputCanvas}
            ref={errorCanvasRef}
            width={videoWidth}
            height={videoHeight}>
          </canvas>
          {/*<div 
            className={styles.gridContainer}
            ref={landmarkGridContainerRef}
            width={videoWidth}
            height={videoHeight}
          ></div>*/}
        </div>
        <video ref={proVid} 
               muted 
               playsInline
               className={styles.proVideo}
               onTimeUpdate={videoTimeUpdate} 
               style={{
                 opacity:proOpacity + '%',
                 transform: 'scaleX(' + proOrientation + ')',
                }}>
          <source src={"/videos/" + proSelection + ".webm"}
              type="video/webm" />
          <source src={"/videos/" + proSelection + ".mp4"}
              type="video/mp4" />
        </video>
        <div 
            className={styles.countDownContainer}
            active={stepped ? 1 : 0}>
          <div ref={progressBar}
              className={styles.countDownBar}
              style={{'--animTime': stepTime + 's'}}
            >
          </div>
        </div>
        <div 
            className={styles.countDownContainer}
            active={inPauseTime ? 1 : 0}>
          <div ref={pauseBar}
              className={styles.countDownBar}
            >
          </div>
        </div>
        <div className={styles.controlsContainer}>
          <button 
              className={styles.controlsPlayButton}
              onClick={startOrStopVideo}
              >
                Play
          </button>
          <div  ref={seekBar} 
                className={styles.controlsProgressBarContainer}
                onClick={seekClicked}
                >
            <div className={styles.controlsProgressBarOutline}>
              <div 
                  className={styles.controlsProgressBarProgress}
                  style={{width: seekWidth + '%'}}
                  >
              </div>
            </div>
          </div>
          <div className={styles.cameraIconContainer} active={webcamActive ? "true" : "false"}>
            {webcamActive ? <i className="bi bi-camera-video-fill"></i> : <i className="bi bi-camera-video"></i>}
          </div>
        </div>
        <div className={styles.speechContainer} ref={speechContainer}>
          {isSpeaking ? <i className="bi bi-mic-fill"></i> : <i className="bi bi-mic"></i>} 
          <span ref={speechText}
            onAnimationEnd={() => 
              {
                speechText.current.classList.remove(styles.fadeOutAnimation);
                speechText.current.innerText = '';
              }
            }
          ></span>
        </div>
      </div>
    </div>
  )
}