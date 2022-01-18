
import { useEffect, useState, useRef } from 'react';
import Webcam from 'react-webcam';
import styles from './Form.module.css'

export default function Form() {

  const proVid = useRef(null);
  const [videoHeight, setVideoHeight] = useState(0);
  const [proOpacity, setProOpacity] = useState(50);
  const [camOpacity, setCamOpacity] = useState(100);
  const [camOrientation, setCamOrientation] = useState(1);
  const [proRate, setProRate] = useState(100);
  const [proZoom, setProZoom] = useState(100);
  const [stepped, setStepped] = useState(false);
  const [stepTimer, setStepTimer] = useState(undefined);
  const [stepTime, setStepTime] = useState(5);

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
    let step = totalTime / 7;

    // create a timer to trigger every 5 seconds
    setStepTimer(setInterval(() => {
      let newTime = proVid.current.currentTime += step;
      if (newTime > totalTime) {
        newTime = 0;
      }
      proVid.current.currenTime = newTime;
    }, stepTime*1000));

    setStepped(true);
  }

  const stepTimeChange = (e) => {
    let t = e.target.value;
    setStepTime(t);

    // calculate the step
    let totalTime = proVid.current.duration;
    let step = totalTime / 7;

    if (stepTimer) {
      clearInterval(stepTimer);
      setStepTimer(setInterval(() => {
        let newTime = proVid.current.currentTime += step;
        if (newTime > totalTime) {
          newTime = 0;
        }
        proVid.current.currenTime = newTime;
      }, t*1000));
    }
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Welcome to the Form App</h1>
      <div>
        <input type="range" id="pro-vid-opacity" name="pro-vid-opacity" 
              min="0" max="100" step="10"
              value={proOpacity}
              onChange={e => setProOpacity(e.target.value)} />
        <label htmlFor="pro-vid-opacity">Pro {proOpacity}%</label>
        <input type="range" 
               id="cam-vid-opacity" 
               name="cam-vid-opacity" 
               min="0" max="100" step="10"
               value={camOpacity}
               onChange={e => setCamOpacity(e.target.value)} />
        <label htmlFor="cam-vid-opacity">You {camOpacity}%</label>
        <button onClick={() => setCamOrientation(camOrientation === 1 ? -1 : 1)}>Flip Cam</button>
        <input type="range" 
               id="pro-rate" 
               name="pro-rate" 
               min="0" max="100" step="10"
               value={proRate}
               onChange={proRateChange} />
        <label htmlFor="pro-rate">Video Speed: {proRate}</label>
        <input type="checkbox" 
               id="step-video" 
               name="step-video"
               onChange={changeToStepped}
               checked={stepped} />
        <label htmlFor="step-video">Step Video</label>
        <input type="range" 
               id="step-time" 
               name="step-time" 
               min="0" max="10" step="1"
               value={stepTime}
               onChange={stepTimeChange} />
        <label htmlFor="step-time">Step Time: {stepTime}s</label>
        {/*<input type="range" 
               id="pro-zoom" 
               name="pro-zoom" 
               min="100" max="200" step="10"
               value={proZoom}
               onChange={e => setProZoom(e.target.value)} />
  <label htmlFor="pro-zoom">Zoom: {proZoom}%</label>*/}
      </div>
      <div className={styles.videoContainer}>
        <div className={styles.webcamContainer}
             style={{
                opacity:camOpacity + '%',
                transform: 'scaleX('+camOrientation+')',
               }}>
          <Webcam 
              height={videoHeight}
          />
        </div>
        <video ref={proVid} 
               controls
               muted 
               loop
               className={styles.proVideo} 
               style={{
                 opacity:proOpacity + '%',
                 transform: 'scale(' + proZoom / 100 + ')',
                }}>
          <source src="/videos/eagle5.webm"
              type="video/webm" />
        </video>
      </div>
      {/*<div className={styles.videoControlButtonContainer}>
        <button className={styles.videoControl}>Play</button>
      </div>*/}
    </div>
  )
}