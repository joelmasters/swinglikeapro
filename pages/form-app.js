import Head from 'next/head'
import Image from 'next/image'
import Header from '../components/Header'
import Form from '../components/Form'
import BrowserDetection from '../components/BrowserDection'

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

        {/*<!-- Global site tag (gtag.js) - Google Analytics -->*/}
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS}`}></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS}', {
            page_path: window.location.pathname,
          });
        `,
          }}
        />
      </Head>
      <Header />
      <BrowserDetection />
      <Form />
    </div>
  )
}
