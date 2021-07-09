
import styles from './Splash.module.css'
import MainCarousel from './MainCarousel'
import SignupForm from './SignupForm'

export default function Splash() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Welcome to the Lab</h1>
      {/*<MainCarousel />*/}
      <h1 className={styles.title}>Our Mission</h1>
      <ul className={styles.list}>
        <li>Provide disc golfers of all levels with performance metrics that will help them improve their games</li>
        <li>Advance the science and skill of disc golf</li>
        <li>Grow the game</li>
      </ul>
      <SignupForm />
    </div>
  )
}