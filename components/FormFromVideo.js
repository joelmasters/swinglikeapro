import { useEffect, useState, useRef } from 'react';
import Spinner from 'react-bootstrap/Spinner';
import { Camera, CameraOptions } from '@mediapipe/camera_utils';
import { SelfieSegmentation } from '@mediapipe/selfie_segmentation';
import { Pose } from '@mediapipe/pose';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import styles from './FormFromVideo.module.css';
import { poseDataEagle, poseDataEagleMirrored } from './data/poseDataEagle.js';
import { poseDataRicky, poseDataRickyMirrored } from './data/poseDataRicky.js';
import { poseDataClemons, poseDataClemonsMirrored } from './data/poseDataClemons.js';
import helpers from './form-helpers';
import Button from 'react-bootstrap/Button';

/*
    What we need:
    - two video elements that can be scaled and moved
      1. pro video
      2. uploaded video
    - three seek bars:
      1. pro video
      2. uploaded video
      3. both videos at the same time
    - two opacity sliders:
      1. pro video
      2. uploaded video
    - speed slider that applies to both videos

*/

export default function FormFromVideo() {
  const PLAYBACK_BARS_HEIGHT = useRef(120);
  const PRO_VID_HEIGHT = 480;
  const PRO_VID_WIDTH = 720;
  const YOU_VID_HEIGHT = 480;
  const YOU_VID_WIDTH = 720;

  const mainCanvasRef = useRef(null);
  const proVid = useRef(null);
  const youVid = useRef(null);
  const youSource = useRef(null);
  const fileUpload = useRef(null);
  const proSeekBar = useRef(null);
  const youSeekBar = useRef(null);
  const allSeekBar = useRef(null);

  const proVidAttributes = useRef({height: PRO_VID_HEIGHT, width: PRO_VID_WIDTH, x: 0, y: 0});
  const youVidAttributes = useRef({height: YOU_VID_HEIGHT, width: YOU_VID_WIDTH, x: 0, y: 0});
  const proOpacityRef = useRef(50);
  const proOrientationRef = useRef(-1);
  const mouseDownPosition = useRef({x: undefined, y: undefined});
  const activeSelection = useRef('pro');
  const proMSPerFrame = useRef(undefined);
  const youMSPerFrame = useRef(undefined);

  const [proOpacity, setProOpacity] = useState(50);
  const [proScale, setProScale] = useState(100);
  const [proOrientation, setProOrientation] = useState(-1);
  const [proSelection, setProSelection] = useState('eagle');
  const [activeSelect, setActiveSelect] = useState('pro');
  const [proSeekWidth, setProSeekWidth] = useState(0);
  const [youSeekWidth, setYouSeekWidth] = useState(0);
  const [allSeekWidth, setAllSeekWidth] = useState(0);

  const videoTimeUpdate = (vid) => {
    let ref = undefined;
    switch(vid) {
      case("pro"):
        ref = proVid.current;
        break;
      case("you"):
        ref = youVid.current;
        break;
      case("all"):
        break;
    }
    let percentage = ( ref.currentTime / ref.duration ) * 100;

    switch(vid) {
      case("pro"):
        setProSeekWidth(percentage);
        break;
      case("you"):
        setYouSeekWidth(percentage);
        break;
      case("all"):
        setAllSeekWidth(percentage);
        break;
    }

    
  }
  const seekClicked = (e, vid) => {
    let ref = undefined;
    let videoToUpdate = undefined;

    switch(vid) {
      case("pro"):
        ref = proSeekBar.current;
        videoToUpdate = proVid.current;
        break;
      case("you"):
        ref = youSeekBar.current;
        videoToUpdate = youVid.current;
        break;
      case("all"):
        ref = allSeekBar.current;
        break;
    }

    let offset = ref.offsetLeft;
    let left = (e.pageX - offset);
    let totalWidth = ref.getBoundingClientRect().width;
    let percentage = ( left / totalWidth );
    let vidTime = undefined;
    if (vid === "all") {
      videoToUpdate = proVid.current;
      vidTime = videoToUpdate.duration * percentage;
      videoToUpdate.currentTime = vidTime;
      videoToUpdate = youVid.current;
      vidTime = videoToUpdate.duration * percentage;
      videoToUpdate.currentTime = vidTime;
    } else {
      vidTime = videoToUpdate.duration * percentage;
      videoToUpdate.currentTime = vidTime;
    }
  }

  useEffect(() => {
    mainCanvasRef.current.width = window.innerWidth;
    mainCanvasRef.current.height = window.innerHeight-PLAYBACK_BARS_HEIGHT.current;

    // resize the canvas to fill browser window dynamically
    window.addEventListener('resize', resizeCanvas, false);
          
    function resizeCanvas() {
      mainCanvasRef.current.width = window.innerWidth;
      mainCanvasRef.current.height = window.innerHeight-PLAYBACK_BARS_HEIGHT.current;
    }

    mainCanvasRef.current.addEventListener('mousedown', (e) => {
      mainCanvasRef.current.addEventListener('mousemove', handleMouseMove);
      e.preventDefault();
      mouseDownPosition.current.x = e.offsetX;
      mouseDownPosition.current.y = e.offsetY;
    });
    mainCanvasRef.current.addEventListener('mouseup', (e) => {
      mainCanvasRef.current.removeEventListener('mousemove', handleMouseMove);
    })

    fileUpload.current.addEventListener('change', readVideo);

    drawFirstFrame(proVid.current);
    drawVideoToCanvas();

    proMSPerFrame.current = calculateMSPerFrame(proVid.current);

  }, [])

  useEffect(() => {
    proOpacityRef.current = proOpacity;
  }, [proOpacity]);

  useEffect(() => {
    proOrientationRef.current = proOrientation;
  }, [proOrientation])

  const readVideo = (event) => {
    if (event.target.files && event.target.files[0]) {
      var reader = new FileReader();
      
      reader.onload = function(e) {
        console.log('loaded');
        youSource.current.src = e.target.result;
        youVid.current.load();
        drawFirstFrame(youVid.current);

        youMSPerFrame.current = calculateMSPerFrame(youVid.current);
      }.bind(this)
  
      reader.readAsDataURL(event.target.files[0]);
    }
  }

  const drawFirstFrame = (vid) => {
    let playPromise = vid.play();

    if (playPromise !== undefined) {
      playPromise.then(_ => {
        vid.pause();
        vid.currentTime = 0.0;
      })
      .catch(error => {
        console.log(error);
      });
    }
  }

  const drawVideoToCanvas = () => {
    const ctx = mainCanvasRef.current.getContext('2d');

    function step() {
      ctx.clearRect(0,0,mainCanvasRef.current.width,mainCanvasRef.current.height);
      if (youVid.current) {
        ctx.drawImage(youVid.current, 
          youVidAttributes.current.x, 
          youVidAttributes.current.y,
          youVidAttributes.current.width, 
          youVidAttributes.current.height);
      }
      ctx.save();
      ctx.globalAlpha = proOpacityRef.current/100;
      ctx.scale(proOrientationRef.current, 1);
      ctx.drawImage(proVid.current, 
        proVidAttributes.current.x, 
        proVidAttributes.current.y,
        proVidAttributes.current.width*proOrientationRef.current, 
        proVidAttributes.current.height);
      ctx.restore();
      requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }

  const handleMouseMove = (e) => {
    e.preventDefault();
    const draggedX = e.movementX;
    const draggedY = e.movementY;

    switch(activeSelection.current) {
      case('pro'):
        proVidAttributes.current.x += (draggedX)*proOrientationRef.current;
        proVidAttributes.current.y += draggedY;
        break;
      case('you'):
        youVidAttributes.current.x += draggedX;
        youVidAttributes.current.y += draggedY;
        break;
      default:
        console.log("no selection active");
        break;
    }
  }

  const pauseOrPlayVideo = () => {
    if (proVid.current.paused) {
      proVid.current.play();
      youVid.current.play();
    } else {
      proVid.current.pause();
      youVid.current.pause();
    }
  }

  const changeActive = (e) => {
    activeSelection.current = e.target.value;
    setActiveSelect(e.target.value);
  }

  const calculateMSPerFrame = (vid) => {
    // this needs to be updated
    return 1/29.97 * 1000;
  }

  const handleBackClick = (e, ref) => {
    switch(ref) {
      case("pro"):
        stepBack(proVid.current);
        break;
      case("you"):
        stepBack(youVid.current);
        break;
      case("all"):
        stepBack(proVid.current);
        stepBack(youVid.current);
        break;
      default:
        break;
    }
  }

  const stepBack = (ref) => {
    let newTime = ref.currentTime - proMSPerFrame.current/1000;
    if (newTime < 0) newTime = 0;
    ref.currentTime = newTime;
  }

  const handleForwardClick = (e, ref) => {
    switch(ref) {
      case("pro"):
        stepForward(proVid.current);
        break;
      case("you"):
        stepForward(youVid.current);
        break;
      case("all"):
        stepForward(proVid.current);
        stepForward(youVid.current);
        break;
      default:
        break;
    }
  }

  const stepForward = (ref) => {
    let newTime = ref.currentTime + proMSPerFrame.current/1000;
    if (newTime > ref.duration) newTime = ref.duration;
    ref.currentTime = newTime;
  }

  const scaleVideo = (e, ref) => {
    let scale = e.target.value/100;
    
    switch(ref) {
      case('pro'):
        proVidAttributes.current.width = PRO_VID_WIDTH*scale;
        proVidAttributes.current.height = PRO_VID_HEIGHT*scale;
        break;
      case('you'):
        youVidAttributes.current.width = YOU_VID_WIDTH*scale;
        youVidAttributes.current.height = YOU_VID_HEIGHT*scale;
        break;
    }

    setProScale(e.target.value);
  }
  
  
  return(
    <>
      <select name="pro-select" 
                id="pro-select" 
                value={proSelection}
                onChange={(e) => setProSelection(e.target.value)}>
        <option value="eagle">Eagle McMahon (Backhand)</option>
        <option value="ricky">Ricky Wysocki (Backhand)</option>
        <option value="clemons">Chris Clemons (Forehand)</option>
        {/*<option value="kajiyama">Manabu Kajiyama</option>*/}
      </select>

      <button 
          onClick={() => setProOrientation(proOrientation === 1 ? -1 : 1)}>Flip Pro</button>
      
      <Button
          onClick={pauseOrPlayVideo}>Play/Pause</Button>

      <input 
        type="range" id="pro-vid-opacity" name="pro-vid-opacity" 
        min="0" max="100" step="10"
        value={proOpacity}
        onChange={e => setProOpacity(e.target.value)} />
      <input 
        type="range" id="pro-vid-scale" name="pro-vid-scale" 
        min="20" max="200" step="2"
        value={proScale}
        onChange={e => scaleVideo(e, activeSelect)} />

      <select name="active-select" 
                id="active-select" 
                value={activeSelect}
                onChange={changeActive}>
        <option value="pro">Pro</option>
        <option value="you">You</option>
      </select>

      <input ref={fileUpload} type="file" accept="video/*" id="input-tag"/>

      <canvas
        ref={mainCanvasRef}
        className={styles.mainCanvas}
        height={20}
        width={20}
      />

      <div className={styles.playbackBarsContainer}>
        <button className={styles.playbackButton} onClick={(e) => handleBackClick(e, "pro")}>
          -
        </button>
        <div className={styles.playbackBarOutline}
             onClick={(e) => {seekClicked(e, "pro")}}
             ref={proSeekBar}>
          <div className={styles.playbackBar} 
            style={{width: proSeekWidth + '%'}}
          />
          <div className={styles.playbackTitle}>
            Pro
          </div>
        </div>
        <button className={styles.playbackButton} onClick={(e) => handleForwardClick(e, "pro")}>
          +
        </button>
        <button className={styles.playbackButton} onClick={(e) => handleBackClick(e, "you")}>
          -
        </button>
        <div className={styles.playbackBarOutline}
          onClick={(e) => {seekClicked(e, "you")}}
          ref={youSeekBar}
        >
          <div className={styles.playbackBar} 
            style={{width: youSeekWidth + '%'}}
          />
          <div className={styles.playbackTitle}>
            You
          </div>
        </div>
        <button className={styles.playbackButton} onClick={(e) => handleForwardClick(e, "you")}>
          +
        </button>
        <button className={styles.playbackButton} onClick={(e) => handleBackClick(e, "all")}>
          -
        </button>
        <div className={styles.playbackBarOutline}
          onClick={(e) => {seekClicked(e, "all")}}
          ref={allSeekBar}>
          <div className={styles.playbackBar}
                style={{width: allSeekWidth + '%'}}
          
          />
          <div className={styles.playbackTitle}>
            Both
          </div>
        </div>
        <button className={styles.playbackButton} onClick={(e) => handleForwardClick(e, "all")}>
          +
        </button>
      </div>

      <video ref={proVid} 
               muted 
               playsInline
               className={styles.proVideo}
               onTimeUpdate={() => videoTimeUpdate("pro")} 
               style={{
                 opacity:proOpacity + '%',
                 transform: 'scaleX(' + proOrientation + ')',
                }}>
          <source src={"/videos/" + proSelection + ".webm"}
              type="video/webm" />
          <source src={"/videos/" + proSelection + ".mp4"}
              type="video/mp4" />
        </video>

      <video ref={youVid}
              muted
              playsInline
              id="video-tag" 
              onTimeUpdate={() => videoTimeUpdate("you")}
              className={styles.youVideo}>
        <source ref={youSource} id="video-source"/>
        Your browser does not support the video tag.
      </video>

    </>
  )
}