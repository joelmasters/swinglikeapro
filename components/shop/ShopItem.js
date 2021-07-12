import Card from 'react-bootstrap/Card'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import styles from './ShopItem.module.css'

export default function ShopItem(props) {
  return(
    <Card className={styles.container} style={{ width: '18rem' }}>
      <Card.Img variant="top" src={props.img} className={styles.img}/>
      <Card.Body>
        <Card.Title>{props.title}</Card.Title>
        <Card.Text>
          <Form>
            <div key={`inline-radio`} className="mb-3">
              <Form.Check inline label="XS" name="group1" type='radio' id={`inline-radio-xs`} />
              <Form.Check inline label="S" name="group1" type='radio' id={`inline-radio-s`} />
              <Form.Check inline label="M" name="group1" type='radio' id={`inline-radio-m`} />
              <Form.Check inline label="L" name="group1" type='radio' id={`inline-radio-l`} />
              <Form.Check inline label="XL" name="group1" type='radio' id={`inline-radio-xl`} />
              <Form.Check inline label="XXL" name="group1" type='radio' id={`inline-radio-xxl`} />
            </div>
          </Form>
          ${props.price}
        </Card.Text>
        <Button variant="primary">Add to cart</Button>
      </Card.Body>
    </Card>
  )
}