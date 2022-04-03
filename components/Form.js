
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Webcam from 'react-webcam';
import Spinner from 'react-bootstrap/Spinner';
import { Camera, CameraOptions } from '@mediapipe/camera_utils';
import { SelfieSegmentation } from '@mediapipe/selfie_segmentation';
import { Pose } from '@mediapipe/pose';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import styles from './Form.module.css';

export default function Form() {

  const PAUSE_TIME = 5000; // ms to pause at end of video before looping
  const SPEECH_DELAY_TIME = 0.5; // delay in seconds for video
  const SPEECH_END_ITERATIONS = 10; // if no speech has been detected for 10 minutes, stop 

  const router = useRouter();

  const proVid = useRef(null);
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  //const landmarkCanvasRef = useRef(null);
  //const landmarkGridContainerRef = useRef(null);
  const progressBar = useRef(null);
  const pauseBar = useRef(null);
  const seekBar = useRef(null);
  const speechContainer = useRef(null);
  const speechText = useRef(null);
  const videoSpeedText = useRef(null);

  const [videoHeight, setVideoHeight] = useState(0);
  const [videoWidth, setVideoWidth] = useState(0);
  const [canvasHeight, setCanvasHeight] = useState(0);
  const [canvasWidth, setCanvasWidth] = useState(0);
  const [proSelection, setProSelection] = useState('eagle');
  const [proOpacity, setProOpacity] = useState(50);
  const [proOrientation, setProOrientation] = useState(-1);
  const [camOpacity, setCamOpacity] = useState(100);
  const [camOrientation, setCamOrientation] = useState(-1);
  const [proRate, setProRate] = useState(50);
  const [stepped, setStepped] = useState(false);
  const [stepTimer, setStepTimer] = useState(undefined);
  const [stepTime, setStepTime] = useState(5);
  const [numberOfSteps, setNumberOfSteps] = useState(7);
  const [runningAnimation, setRunningAnimation] = useState(undefined);
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

  useEffect(()=> {
    // set the height of the webcam video to be equal to the height of the provideo after a delay of 2s

    setTimeout(() => {
      if (proVid.current) {
        setVideoHeight(proVid.current.scrollHeight);
        setVideoWidth(proVid.current.offsetWidth);
        //proVid.current.play();
      }
    }, 2000);

    if (proVid.current) {
      proVid.current.defaultPlaybackRate = 0.5;
    }
    
    // add listener to change the video height on resize
    window.addEventListener('resize', ()=> {
      setVideoHeight(proVid.current.scrollHeight);
      setVideoWidth(proVid.current.offsetWidth);
    })



    proVid.current.addEventListener('ended', () => {
      handleVideoEnd();
    })

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

      debounce(processSpeech(comm), 3000);

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
          console.log("restarting speech");
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
      console.log('Error occurred in recognition: ' + event.error);
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
      /*
      // code for selfie segmentation
      const canvasCtx = canvasRef.current.getContext('2d');

      function onResults(results) {
        canvasCtx.save();
        // Only overwrite missing pixels.
        canvasCtx.globalCompositeOperation = 'destination-atop';
        canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);
        canvasCtx.globalCompositeOperation = 'destination-in';
        canvasCtx.drawImage(results.segmentationMask, 0, 0, canvasRef.current.width, canvasRef.current.height);
        canvasCtx.restore();
      }
  
      const selfieSegmentation = new SelfieSegmentation({locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`;
      }});
      selfieSegmentation.setOptions({
        modelSelection: 1,
      });
      selfieSegmentation.onResults(onResults);
  
      var sendCounter = 0;
      const camera = new Camera(webcamRef.current.video, {
        onFrame: async () => {
          if (sendCounter === 1) {
            console.log("segmentation started");
            setWebcamLoaded(true);
          }
          await selfieSegmentation.send({image: webcamRef.current.video});
          sendCounter++;
        }
      });
      camera.start();
      
      // end code for selfie segmentation
      */

      //const landmarkContainer = landmarkGridContainerRef.current;
      //const grid = new LandmarkGrid(landmarkContainer);
      const canvasCtx = canvasRef.current.getContext('2d');
      //const lmCtx = landmarkCanvasRef.current.getContext('2d');
      let counter = 0;

      proVid.current.addEventListener('play', () => {
        //lmCtx.clearRect(0, 0, landmarkCanvasRef.current.width, landmarkCanvasRef.current.height);
        videoPlayStartTime.current = new Date();
        //console.log("video play time: ", videoPlayStartTime.current);
      });

      function onResults(results) {
        if (!results.poseLandmarks) {
          //grid.updateLandmarks([]);
          return;
        }
        if (isPlayingBack.current === true) return;
      
        canvasCtx.save();
        // Only overwrite missing pixels.
        canvasCtx.globalCompositeOperation = 'destination-atop';
        canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);
        canvasCtx.globalCompositeOperation = 'destination-in';
        canvasCtx.drawImage(results.segmentationMask, 0, 0, canvasRef.current.width, canvasRef.current.height);
        //canvasCtx.restore();
        
        canvasCtx.globalCompositeOperation = 'source-over';
        //drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS,{color: '#00FF00', lineWidth: 4});
        //drawLandmarks(canvasCtx, results.poseLandmarks,{color: '#FF0000', lineWidth: 2});
        canvasCtx.restore();
        
        //lmCtx.globalCompositeOperation = 'source-over';
        /*if (counter % 50 === 0) {
          lmCtx.save();
          drawLandmarks(lmCtx, results.poseLandmarks,{color: '#FF0000', opacity: 0.25, lineWidth: 2});
          lmCtx.restore();
        }*/

        if (!proVid.current.paused) {
          if (resultsRecorded.current === []) {
            resultsStartTime.current = new Date();
          }
          //console.log("adding results");
          resultsRecorded.current.push(results);
        } 

        counter++;

        // TODO: match up frames with proVideo -- offset delay or something? Is this affected by CPU speed?
        // add in pause time for resetting back to start with live camera

      
        //grid.updateLandmarks(results.poseWorldLandmarks);
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
      const camera = new Camera(webcamRef.current.video, {
        onFrame: async () => {
          if (sendCounter === 1) {
            console.log("segmentation started");
            setWebcamLoaded(true);
          }
          await pose.send({image: webcamRef.current.video});
          if (sendCounter > 1) return
          sendCounter++;
        }
      });
      camera.start();

  }

  const handleVideoEnd = () => {
    
    if (isPlayingBack.current == true) {
      setInPlayBack(false);
      isPlayingBack.current = false;
      setInPauseTime(true);
      isPausing.current = true;
      animatePauseBar();
    } else {
      isPlayingBack.current = true;
      setInPlayBack(true);
      playbackRecording();
    }
  }

  const playbackRecording = () => {

    // this function plays back what was recorded from the previous throw
    let playbackTimer = undefined;
    let playbackCounter = 0;
    //const playbackFrameRate = 1000 / (proVid.current.playbackRate * 30); // ms for 1 frame every 30 sec

    // duration / playback rate == adjusted time (5.2 seconds)
    // resultsRecorded.length = # of frames
    // # of frames / number of seconds ==> frames/second
    // invert that for seconds/frame * 1000

    const playbackFrameRate = ((proVid.current.duration / proVid.current.playbackRate) / resultsRecorded.current.length ) * 1000;
    const canvasCtx = canvasRef.current.getContext('2d');

    // set the video time back to zero, set the playrate to 1.0 (~30fps), and play the video
    proVid.current.currentTime = 0;
    //proVid.current.playbackRate = 30/29.97;
    proVid.current.play();
    
    // play back the previous recorded form
    if (!playbackTimer) {

      // TODO: remove first X number of frames corresponding to the delay
      
      playbackTimer = setInterval(() => {
        if (playbackCounter >= resultsRecorded.current.length || isPlayingBack.current === false) {
          console.log("exiting playback");
          resultsRecorded.current = [];
          clearInterval(playbackTimer);
          return
        }

        canvasCtx.save();
        canvasCtx.globalCompositeOperation = 'destination-atop';
        canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        canvasCtx.drawImage(resultsRecorded.current[playbackCounter].image, 0, 0, canvasRef.current.width, canvasRef.current.height);
        canvasCtx.globalCompositeOperation = 'destination-in';
        canvasCtx.drawImage(resultsRecorded.current[playbackCounter].segmentationMask, 0, 0, canvasRef.current.width, canvasRef.current.height);
        canvasCtx.restore();
        
        playbackCounter++;

      }, playbackFrameRate)
    }  
  }

  const animatePauseBar = () => {

    proVid.current.currentTime = 0;

    pauseBar.current.animate([
      {transform: 'translateX(-100%)'},
      {transform: 'translateX(0%)'}
    ], {
      duration: PAUSE_TIME * proVid.current.playbackRate,
      iterations: 1
    });

    setTimeout(() => {
      if (proVid.current) {
        //proVid.current.playbackRate = proRate / 100;
        proVid.current.play();
      }
    }, PAUSE_TIME * proVid.current.playbackRate)
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
        debounce(slowDownVideo(), 300);
        break;
      case('speed up'):
        debounce(speedUpVideo(), 300);
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

  const debounce = (func, timeout = 300) => {
    let timer;
    return (...args) => {
      if (!timer) {
        func.apply(this, args);
      }
      clearTimeout(timer);
      timer = setTimeout(() => {
        timer = undefined;
      }, timeout);
    };
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

  const changeToStepped = () => {
    if (stepped === true) {
      // stop the timer
      clearInterval(stepTimer);
      setStepped(false);
      runningAnimation.cancel();
      setRunningAnimation(undefined);

      // pause the video and reset back to time zero
      proVid.current.pause();

      proVid.current.currentTime = 0;
      return
    } 

    // pause the video
    proVid.current.pause();

    // set the video to the beginning
    proVid.current.currentTime = 0;

    // calculate the step
    let totalTime = proVid.current.duration;
    let step = totalTime / numberOfSteps;

    // create a timer to trigger every {step} seconds
    startStepTimer(totalTime, step, stepTime);

    setStepped(true);
  }

  const stepTimeChange = (e) => {
    let t = e.target.value;
    setStepTime(t);

    // calculate the step
    let totalTime = proVid.current.duration;
    let step = totalTime / numberOfSteps;

    if (stepTimer) {
      clearInterval(stepTimer);
      startStepTimer(totalTime, step, t);
    }
  }

  const numberOfStepsChange = (e) => {
    let n = e.target.value;
    setNumberOfSteps(n);

    // calculate the step
    let totalTime = proVid.current.duration;
    let step = totalTime / n;

    if (stepTimer) {
      clearInterval(stepTimer);
      startStepTimer(totalTime, step, stepTime);
    }
  }

  const startStepTimer = (totalTime, stepLength, stepPauseTime) => {

    proVid.current.currentTime = 0;

    if (runningAnimation) {
      runningAnimation.cancel();
      setRunningAnimation(undefined);
    }

    let anim = progressBar.current.animate([
      {transform: 'translateX(-100%)'},
      {transform: 'translateX(0%)'}
    ], {
      duration: stepPauseTime*1000,
      iterations: Infinity
    });
    setRunningAnimation(anim);

    // clear the old timer before starting a new one
    clearInterval(stepTimer);

    let intervalId = setInterval(() => {
      let newTime = proVid.current.currentTime += stepLength;
      if (newTime > totalTime) {
        newTime = 0;
      }
      proVid.current.currenTime = newTime;
    }, stepPauseTime*1000);

    setStepTimer(intervalId);  
  }

  const proVidSourceChange = (e) => {
    setProSelection(e.target.value);
  }

  useEffect(() => {
    proVid.current.load();
    setSeekWidth(0);
  }, [proSelection])

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
  const playVideo = () => {
    if (proVid.current.paused) {
      proVid.current.play();
    } else {
      proVid.current.pause();
    }
  }

  const startOrStopVideo = () => {
    
    // if stepped video is playing, stop it
    if (stepped) {
      clearInterval(stepTimer);
      setStepped(false);
      runningAnimation.cancel();
      setRunningAnimation(undefined);
      proVid.current.pause();
    } else if (proVid.current.paused) {
      proVid.current.play();
    } else {
      proVid.current.pause();
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.instructionsContainer}>
        This app is designed for use on a large screen, i.e. laptop or computer with webcam. <br />
        Voice commands include: Play, Pause, Stop, Speed Up, Slow Down, Restart, and Start Over. <br />
        Please send feedback to: <a href="mailto: joelmasters@gmail.com">joelmasters@gmail.com</a>
      </div>
      <div className={styles.optionContainer}>
        <select name="pro-select" 
                id="pro-select" 
                value={proSelection}
                onChange={proVidSourceChange}>
          <option value="eagle">Eagle McMahon</option>
          <option value="ricky">Ricky Wysocki</option>
          <option value="kajiyama">Manabu Kajiyama</option>
        </select>
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
            <td className={styles.optionBlockLeft}>
              Step Time
            </td>
            <td className={styles.optionBlockRight}>
              <input className={styles.optionBlock}
                    type="range" 
                    id="step-time" 
                    name="step-time" 
                    min="1" max="10" step="1"
                    value={stepTime}
                    onChange={stepTimeChange} />
              <label htmlFor="step-time">{stepTime}s</label>
            </td>
          </tr>
          <tr>
            <td className={styles.optionBlockLeft}>
              Number of Steps
            </td>
            <td className={styles.optionBlockRight}>
              <input className={styles.optionBlock}
                    type="range" 
                    id="number-of-steps" 
                    name="number-of-steps" 
                    min="3" max="15" step="1"
                    value={numberOfSteps}
                    onChange={numberOfStepsChange} />
              <label htmlFor="number-of-steps">{numberOfSteps}</label>
            </td>
          </tr>
          <tr>
            <td className={styles.optionBlockLeft}>
              Step Video
            </td>
            <td className={styles.optionBlockRight}>
              <input className={styles.optionBlock}
                    type="checkbox" 
                    id="step-video" 
                    name="step-video"
                    onChange={changeToStepped}
                    checked={stepped} />
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
              videoConstraints={{facingMode: "user"}}
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
          {/*<canvas
            className={styles.outputCanvas}
            ref={landmarkCanvasRef}
            width={videoWidth}
            height={videoHeight}>
          </canvas>*/}
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
              onClick={playVideo}
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