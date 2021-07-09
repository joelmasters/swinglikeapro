import { useState, useRef } from 'react'
import ReactPlayer from 'react-player/youtube'
import Button from 'react-bootstrap/Button'
import styles from './VideoLayer.module.css'

const VideoLayer = () => {
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [time1, setTime1] = useState(0);
  const [time2, setTime2] = useState(1);

  const vid1 = useRef();
  const vid2 = useRef();
  const vid3 = useRef();
  const vid4 = useRef();

  const ready = (num) => {
    console.log(`player ${num} ready`);
  }

  const playing = () => {
    console.log("playing")
  }
  const pausing = () => {
    console.log("pausing")
  }

  const seek = (amount) => {
    vid1.current.seekTo(amount);
    vid2.current.seekTo(amount);
    vid3.current.seekTo(amount);
    vid4.current.seekTo(amount);
  }

  return(
    <>
      <ReactPlayer url="https://www.youtube.com/watch?v=M7lc1UVf-VE?start=50"
                   ref={vid1}
                   controls={true}
                   playing={isPlaying}
                   onReady={() => ready(0)}
                   onPlay={playing}
                   onPause={pausing}
      />
      <ReactPlayer url="https://www.youtube.com/watch?v=1nGwbZXJmvo?start=50"
                   controls={true}
                   ref={vid2}
                   playing={isPlaying}
                   onReady={() => ready(1)}
                   onPlay={playing}
                   onPause={pausing}
      />
      <div className={styles.videoOverlay}>
        <ReactPlayer url="https://www.youtube.com/watch?v=1nGwbZXJmvo?wmode=transparent"
                  className={styles.videoBottom}
                  ref={vid3}
                  controls={true}
                  playing={isPlaying}
                  onReady={() => ready(0)}
                  onPlay={playing}
                  onPause={pausing}
        />
        <ReactPlayer url="https://www.youtube.com/watch?v=M7lc1UVf-VE?start=50?wmode=transparent"
                  className={styles.videoTop}
                  ref={vid4}
                  controls={true}
                  playing={isPlaying}
                  onReady={() => ready(0)}
                  onPlay={playing}
                  onPause={pausing}
        />
      </div>
      <Button onClick={() => setIsPlaying(true)}>Play</Button>
      <Button onClick={() => setIsPlaying(false)}>Pause</Button>
      <Button onClick={() => seek(0)}>Restart</Button>
    </>
  )

}

export default VideoLayer;