
import { useEffect, useState, useRef } from 'react';
import { Camera, CameraOptions } from '@mediapipe/camera_utils';
import { SelfieSegmentation } from '@mediapipe/selfie_segmentation';
import { Pose } from '@mediapipe/pose';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import styles from './Form.module.css';

export default function Form() {

  const proVid = useRef(null);
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const graphRef = useRef(null);

  const [videoHeight, setVideoHeight] = useState(0);
  const [videoWidth, setVideoWidth] = useState(0);
  const [proSelection, setProSelection] = useState('eagle');
  const [proOpacity, setProOpacity] = useState(50);
  const [proOrientation, setProOrientation] = useState(-1);
  const [webcamLoaded, setWebcamLoaded] = useState(false);
  const resultsRecorded = useRef([]);
  const resultsAll = useRef([]);
  const isPlayingBack = useRef(false);
  const videoPlayStartTime = useRef(undefined);
  const resultsStartTime = useRef(undefined);
  const numRuns = useRef(0);

  useEffect(()=> {
    // set the height of the webcam video to be equal to the height of the provideo after a delay of 2s

    setTimeout(() => {
      if (proVid.current) {
        setVideoHeight(proVid.current.scrollHeight);
        setVideoWidth(proVid.current.offsetWidth);
        proVid.current.defaultPlaybackRate = 0.5;
        proVid.current.playbackRate = 0.5;
        //proVid.current.style.visibility = "hidden";
        //proVid.current.play();
      }
    }, 2000);
    
    // add listener to change the video height on resize
    window.addEventListener('resize', ()=> {
      setVideoHeight(proVid.current.scrollHeight);
      setVideoWidth(proVid.current.offsetWidth);
    })

    proVid.current.addEventListener('ended', (e) => {
      if (numRuns.current < 5) {
        resultsAll.current.push(resultsRecorded.current);
        resultsRecorded.current = [];
        proVid.current.play();
        numRuns.current++;
      } else {
        // get only the poseLandmarks, and omit 0-10 since these are facial features
        // omit first index, since it is undefined for most runs
        let dataToWrite = resultsAll.current.map(row => 
          row.slice(1).map(x => {
            let first = x.poseLandmarks.slice(11, 17);
            let second = x.poseLandmarks.slice(23, 29);

            let returns = [...first, ...second];

            return returns 
          }));
        
        let segmentationMasks = resultsAll.current.map(row => row.slice(1).map(x => x.segmentationMask));

        //console.log(dataToWrite);

        let dataAveraged = [];
        
        const NUM_LANDMARKS = 12;
        
        /*  Pose landmarks:
           0-10 face - X
        0: 11: left_shoudler 
        1: 12: right_shoulder 
        2: 13: left_elbow 
        3: 14: right_elbow
        4: 15: left_wrist
        5: 16: right_wrist
           17: left_pinky - X
           18: right_pinky - X
           19: left_index - X
           20: right_index - X
           21: left_thumb - X
           22: right_thumb - X
        6: 23: left_hip
        7: 24: right_hip
        8: 25: left_knee
        9: 26: right_knee
        10: 27: left_ankle
        11: 28: right_ankle
        29: left_heel - X
        30: right_heel - X
        31: left_foot_index - X
        32: right_foot_index - X
        */

        let lmAveragesTotal = [];
        // dataToWrite = [run[frame[landmark{}]]
        for (let landmark = 0; landmark < NUM_LANDMARKS; landmark++) {
          let lmAverages = [];
          for (let frame = 0; frame < dataToWrite[0].length; frame++) {
            let frameAvgX = 0;
            let frameAvgY = 0;
            let frameAvgZ = 0;
            for (let run = 0; run < dataToWrite.length; run++) {
              frameAvgX += dataToWrite[run][frame][landmark].x;
              frameAvgY += dataToWrite[run][frame][landmark].y;
              frameAvgZ += dataToWrite[run][frame][landmark].z;
            }
            lmAverages.push({
              x: frameAvgX / dataToWrite.length, 
              y: frameAvgY / dataToWrite.length,
              z: frameAvgZ / dataToWrite.length
            });
          }
          lmAveragesTotal.push(lmAverages);
        }

        // convert to format: frame[landmark[]]

        // frame[{}] length 12
        // have: 12 rows x 70 columns
        // need: 70 rows x 12 columns

        let lmAveragesInverted = [];

        for (let i = 0; i < lmAveragesTotal[0].length; i++) {
          lmAveragesInverted.push([]);
        }

        // 70 rows x 1 column
 
        for (let i = 0; i < lmAveragesTotal.length; i++) { // 12
          for (let j = 0; j < lmAveragesTotal[i].length; j++) { // 70 frames
            lmAveragesInverted[j].push(lmAveragesTotal[i][j]);
          }
        }


        console.log(lmAveragesInverted);
        console.log(segmentationMasks);
      }})


    loadSegmentation();

  }, [])

  const loadSegmentation = () => {
     
      const canvasCtx = canvasRef.current.getContext('2d');
      let counter = 0;

      function onResults(results) {
      
        canvasCtx.save();
        // Only overwrite missing pixels.
        canvasCtx.globalCompositeOperation = 'destination-atop';
        canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);
        canvasCtx.globalCompositeOperation = 'destination-in';
        if (results.segmentationMask) {
          canvasCtx.drawImage(results.segmentationMask, 0, 0, canvasRef.current.width, canvasRef.current.height);
        }
        //canvasCtx.restore();
        
        canvasCtx.globalCompositeOperation = 'source-over';
        drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS,{color: '#00FF00', lineWidth: 4});
        drawLandmarks(canvasCtx, results.poseLandmarks,{color: '#FF0000', lineWidth: 2});
        canvasCtx.restore();

        if (!proVid.current.paused) {
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
        smoothSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });
      pose.onResults(onResults);

      const grabFrame = async (now, metadata) => {
        //console.log("grabbed frame");
        //console.log(metadata);
        //canvasCtx.drawImage(proVid.current, 0, 0, canvasRef.current.width, canvasRef.current.height);

        // TODO: Fix error at end of video
        await pose.send({image: proVid.current});
        proVid.current.requestVideoFrameCallback(grabFrame);
      }

      proVid.current.requestVideoFrameCallback(grabFrame);

  }

  return (
    <div className={styles.container}
      onClick={() => proVid.current.paused ? proVid.current.play() : proVid.current.pause()} 
    >
      <video ref={proVid} 
              muted 
              playsInline
              className={styles.proVideo}
              //onTimeUpdate={videoTimeUpdate}
              onClick={() => proVid.current.paused ? proVid.current.play() : proVid.current.pause()} 
              style={{
                opacity:proOpacity + '%',
                transform: 'scaleX(' + proOrientation + ')',
              }}>
        <source src={"/videos/ricky.webm"}
            type="video/webm" />
        <source src={"/videos/ricky.mp4"}
            type="video/mp4" />
      </video>
      <br />
      <canvas 
        className={styles.outputCanvas}
        style={{
          position: 'relative',
          transform: 'scaleX(-1)'
        }}
        ref={canvasRef}
        width={videoWidth}
        height={videoHeight}
        onClick={() => proVid.current.paused ? proVid.current.play() : proVid.current.pause()} 
        > 
      </canvas>
      <canvas 
        className={styles.outputCanvas}
        style={{
          position: 'relative',
        }}
        ref={graphRef}
        width={videoWidth}
        height={videoHeight}
        > 
      </canvas>
    </div>
  )
}