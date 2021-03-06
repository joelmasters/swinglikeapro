import Head from 'next/head'
import Image from 'next/image'
import Header from '../components/Header'
import ArticlesMain from '../components/ArticlesMain'

export default function Shop() {
  return (
    <div className="hello">
      <Head>
        <title>Disc Golf Performance Lab</title>
        <meta name="description" content="Generated by create next app" />
        <link rel="icon" href="./black_icon_32.png" />
      </Head>
      <Header />
      <ArticlesMain />
    </div>
  )
}