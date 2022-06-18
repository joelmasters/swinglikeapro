import Navbar from 'react-bootstrap/Navbar'
import Nav from 'react-bootstrap/Nav'
import Image from 'react-bootstrap/Image'

export default function Header() {
  return  (
    <Navbar bg="light" expand="md">
      <Navbar.Brand href="/">SwingLikeAPro</Navbar.Brand>
      <Navbar.Toggle aria-controls="basic-navbar-nav" />
      <Navbar.Collapse id="basic-navbar-nav">
        {/*<Nav className="mr-auto">
          <Nav.Link href="/">Home</Nav.Link>
          <Nav.Link href="/shop">Shop</Nav.Link>
          <Nav.Link href="/form-app">Form App</Nav.Link>
  </Nav>*/}
      </Navbar.Collapse>
    </Navbar>
  )
}