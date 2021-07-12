
import styles from './ShopBody.module.css'
import ShopItem from './shop/ShopItem'

export default function ShopBody() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Welcome to the Shop</h1>
      <h5>Coming soon</h5>
      {/*<ShopItem
        title="Logo T-Shirt"
        img="./shop/logo-tshirt.png"
        price={25.00}
      />
      <ShopItem
        title="Sticker"
        img="./shop/logo_black_large_transparent.png"
        price={5.00}
      />*/}
    </div>
  )
}