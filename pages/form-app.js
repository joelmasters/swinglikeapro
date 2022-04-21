import Head from 'next/head'
import Image from 'next/image'
import Header from '../components/Header'
import Form from '../components/Form'

export default function FormApp() {
  return (
    <div className="hello">
      <Head>
        <title>Disc Golf Performance Lab</title>
        <meta name="description" content="Disc Golf Performance Lab Form App" />
        <link rel="icon" href="./black_icon_32.png" />
        <script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js" crossOrigin="anonymous"></script>
        <script src="https://cdn.jsdelivr.net/npm/@mediapipe/control_utils/control_utils.js" crossOrigin="anonymous"></script>
        <script src="https://cdn.jsdelivr.net/npm/@mediapipe/control_utils_3d/control_utils_3d.js" crossOrigin="anonymous"></script>
        <script src="https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js" crossOrigin="anonymous"></script>
        <script src="https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js" crossOrigin="anonymous"></script>
      </Head>
      <Header />
      <Form />
    </div>
  )
}
