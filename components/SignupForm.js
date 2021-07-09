import MailchimpSubscribe from "react-mailchimp-subscribe"

const url = "https://discgolfperformancelab.us6.list-manage.com/subscribe/post?u=5dd7151c45fe1807e25784f54&amp;id=8470ed0570";

// simplest form (only email)
const SimpleForm = () => <MailchimpSubscribe url={url}/>

// use the render prop and your custom form
const SignupForm = () => (
  <>
    <br />
    <h5>Join our mailing list</h5>
    <MailchimpSubscribe
      url={url}
      render={({ subscribe, status, message }) => (
        <div>
          <SimpleForm onSubmitted={formData => subscribe(formData)} />
          {status === "sending" && <div style={{ color: "blue" }}>sending...</div>}
          {status === "error" && <div style={{ color: "red" }} dangerouslySetInnerHTML={{__html: message}}/>}
          {status === "success" && <div style={{ color: "green" }}>Subscribed !</div>}
        </div>
      )}
    />
  </>
)

export default SignupForm;