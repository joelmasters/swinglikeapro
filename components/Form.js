
import { useEffect, useState, useRef } from 'react';
import Webcam from 'react-webcam';
import styles from './Form.module.css'

export default function Form() {

  const PAUSE_TIME = 5000; // ms to pause at end of video before looping
  const SPEECH_DELAY_TIME = 2.0; // delay in seconds for video

  let speechStartTime = 0;

  const proVid = useRef(null);
  const progressBar = useRef(null);
  const pauseBar = useRef(null);
  const seekBar = useRef(null);
  const speechContainer = useRef(null);
  const speechText = useRef(null);

  const [videoHeight, setVideoHeight] = useState(0);
  const [proSelection, setProSelection] = useState('eagle');
  const [proOpacity, setProOpacity] = useState(50);
  const [proOrientation, setProOrientation] = useState(-1);
  const [camOpacity, setCamOpacity] = useState(100);
  const [camOrientation, setCamOrientation] = useState(-1);
  const [proRate, setProRate] = useState(100);
  const [stepped, setStepped] = useState(false);
  const [stepTimer, setStepTimer] = useState(undefined);
  const [stepTime, setStepTime] = useState(5);
  const [numberOfSteps, setNumberOfSteps] = useState(7);
  const [runningAnimation, setRunningAnimation] = useState(undefined);
  const [seekWidth, setSeekWidth] = useState(0);
  const [inDelayTime, setInDelayTime] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  

  useEffect(()=> {
    // set the height of the webcam video to be equal to the height of the provideo after a delay of 2s
    setTimeout(() => {
      setVideoHeight(proVid.current.scrollHeight)
    }, 2000);
    

    // add listener to change the video height on resize
    window.addEventListener('resize', ()=> {
        setVideoHeight(proVid.current.scrollHeight);
    })

    proVid.current.addEventListener('ended', () => {
      setInDelayTime(true);
      pauseBar.current.animate([
        {transform: 'translateX(-100%)'},
        {transform: 'translateX(0%)'}
      ], {
        duration: PAUSE_TIME,
        iterations: 1
      });
      setTimeout(() => {
        proVid.current.currentTime = 0;
        proVid.current.play();
        setInDelayTime(false);
      }, PAUSE_TIME)
    })

    speechText.current.onanimationend = function() {
      speechText.current.innerText = '';
      console.log("animation ended");
    }

    var SpeechRecognition = window.SpeechRecognition || webkitSpeechRecognition;
    var SpeechGrammarList = window.SpeechGrammarList || webkitSpeechGrammarList;
    var SpeechRecognitionEvent = window.SpeechRecognitionEvent || webkitSpeechRecognitionEvent;

    var commands = [ 'play', 'stop', 'slow down', 'speed up'];
    var grammar = '#JSGF V1.0; grammar commands; public <command> = ' + commands.join(' | ') + ' ;';

    var recognition = new SpeechRecognition();
    var speechRecognitionList = new SpeechGrammarList();

    speechRecognitionList.addFromString(grammar, 1);

    recognition.grammars = speechRecognitionList;
    recognition.continuous = true;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.start();
    console.log("speech detection started");

    recognition.onspeechstart = function() {
      console.log("started hearing speech");
      console.log(new Date());
      speechStartTime = new Date();
      setIsSpeaking(true);
    }


    recognition.onresult = function(event) {
      let comm = event.results[event.results.length-1][0].transcript.trim().toLowerCase();
      speechText.current.innerText = comm;
      let speechDelayTime = new Date() - speechStartTime;

      setTimeout(() => {
        speechText.current.animate([
          {opacity: '1.0'},
          {opacity: '0.0'}
        ], {
          duration: 1000,
          iterations: 1
        });
      }, 3000);

      switch(comm) {
        case('play'):
          proVid.current.play();
          break;
        case('pause'):
        case('stop'):
          proVid.current.pause();
          backtrackVideo(speechDelayTime);
          break;
        case('slow down'):
          slowDownVideo();
          break;
        case('speed up'):
          speedUpVideo();
          break;
        default:
          console.log("unrecognized command");
          break;  
      }

      //console.log('Confidence: ' + event.results[0][0].confidence);
      setIsSpeaking(false);
    }

    recognition.onspeechend = function() {
      console.log("speech stopped");

      setTimeout(() => {
        recognition.start();
        console.log("speech starting again");
      }, 400);
    }

    recognition.onnomatch = function(event) {
      console.log("I didn't recognize that command");
    }

    recognition.onerror = function(event) {
      console.log('Error occurred in recognition: ' + event.error);
      setTimeout(() => {
        recognition.start();
        console.log("speech starting again");
      }, 400);
    }

  }, [])

  useEffect(() => {

  }, [proRate])

  const proRateChange = (e) => {
    let rate = e.target.value;
    proVid.current.playbackRate = rate / 100;
    setProRate(parseInt(rate));
  }

  const slowDownVideo = () => {
    if (proRate > 0) {
      proVid.current.playbackRate -= 0.1;
      setProRate(proRate - 10);
    }
  }

  const speedUpVideo = () => {
    if (proRate < 100) {
      proVid.current.playbackRate += 0.1;
      setProRate(proRate + 10);
    }
  }

  const backtrackVideo = (time) => {
    let currTime = proVid.current.currentTime;
    let backTime = currTime - time;
    if (backTime < 0) {
      backTime = proVid.current.totalTime + backTime;
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
        <div className={styles.screenBlocker}
             onClick={startOrStopVideo}>
        </div>
        <div className={styles.webcamContainer}
             style={{
                opacity:camOpacity + '%',
                transform: 'scaleX('+camOrientation+')',
               }}>
          <Webcam 
              audio={false}
              height={videoHeight}
              videoConstraints={{facingMode: "user"}}
              onUserMedia={() => {console.log('connected to user media')}}
              onUserMediaError={(e) => {
                console.log('unable to connect to user media (camera)', e)
              }}
          />
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
            active={inDelayTime ? 1 : 0}>
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
        </div>
        <div className={styles.speechContainer} ref={speechContainer}>
          {isSpeaking ? <i className="bi bi-mic-fill"></i> : <i className="bi bi-mic"></i>} <span ref={speechText}></span>
        </div>
      </div>
    </div>
  )
}