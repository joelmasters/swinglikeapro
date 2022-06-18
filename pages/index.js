import Head from 'next/head'
import Image from 'next/image'
import Header from '../components/Header'
//import Splash from '../components/Splash'
import Form from '../components/Form'

export default function Home() {
  return (
    <div className="hello">
      <Head>
        <title>Swing Like A Pro</title>
        <meta name="description" content="Golf Form Analysis App" />
        {/*<link rel="icon" href="./black_icon_32.png" />*/}
      </Head>
      <Header />
      <Form />
    </div>
  )
}
