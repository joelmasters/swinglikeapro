
import { useEffect, useState, useRef } from 'react';
import Webcam from 'react-webcam';
import styles from './Form.module.css'

export default function Form() {

  const proVid = useRef(null);
  const progressBar = useRef(null);
  const seekBar = useRef(null);
  const [videoHeight, setVideoHeight] = useState(0);
  const [proSelection, setProSelection] = useState('eagle');
  const [proOpacity, setProOpacity] = useState(50);
  const [camOpacity, setCamOpacity] = useState(100);
  const [camOrientation, setCamOrientation] = useState(-1);
  const [proRate, setProRate] = useState(100);
  const [proZoom, setProZoom] = useState(100);
  const [stepped, setStepped] = useState(false);
  const [stepTimer, setStepTimer] = useState(undefined);
  const [stepTime, setStepTime] = useState(5);
  const [numberOfSteps, setNumberOfSteps] = useState(7);
  const [barStyle, setBarStyle] = useState({transition: 'all 0s',transform: 'none'});
  const [runningAnimation, setRunningAnimation] = useState(undefined);
  const [seekWidth, setSeekWidth] = useState(0);

  useEffect(()=> {
    // initially set the height of the webcam video to be equal to the height of the provideo
    setVideoHeight(proVid.current.scrollHeight)

    // add listener to change the video height on resize
    window.addEventListener('resize', ()=> {
        setVideoHeight(proVid.current.scrollHeight);
    })
  }, [])

  const proRateChange = (e) => {
    let rate = e.target.value;
    proVid.current.playbackRate = rate / 100;
    setProRate(rate);
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
      {transform: 'translateX(0%)'},
      {transform: 'translateX(-100%)'}
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

  return (
    <div className={styles.container}>
      <div className={styles.optionContainer}>
      <select name="pro-select" 
              id="pro-select" 
              value={proSelection}
              onChange={proVidSourceChange}>
          <option value="eagle">Eagle McMahon</option>
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
            <td colSpan={2}
                className={styles.buttonCell}>
              <button className={styles.buttonFlip}
                  onClick={() => setCamOrientation(camOrientation === 1 ? -1 : 1)}>Flip Cam</button>
            </td>
          </tr>
      </tbody>
      </table>
      </div>
      <div className={styles.videoContainer}>
        <div className={styles.webcamContainer}
             style={{
                opacity:camOpacity + '%',
                transform: 'scaleX('+camOrientation+')',
               }}>
          <Webcam 
              height={videoHeight}
              videoConstraints={{facingMode: 'user'}}
          />
        </div>
        <video ref={proVid} 
               muted 
               loop
               playsInline
               className={styles.proVideo}
               onTimeUpdate={videoTimeUpdate} 
               style={{
                 opacity:proOpacity + '%',
                 transform: 'scaleX(-1)',
                }}>
          <source src={"/videos/" + proSelection + ".webm"}
              type="video/webm" />
          <source src={"/videos/" + proSelection + ".mp4"}
              type="video/mp4" />
        </video>
        <div className={styles.countDownContainer}>
          <div ref={progressBar}
              className={styles.countDownBar}
              style={{'--animTime': stepTime + 's'}}
              active={stepped ? 1 : 0}
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
      </div>
      {/*<div className={styles.videoControlButtonContainer}>
        <button className={styles.videoControl}>Play</button>
      </div>*/}
    </div>
  )
}