import MailchimpSubscribe from "react-mailchimp-subscribe"

const url = "https://discgolfperformancelab.us6.list-manage.com/subscribe/post?u=5dd7151c45fe1807e25784f54&amp;id=8470ed0570";

// simplest form (only email)
const CustomForm = ({ status, message, onValidated }) => {
  let email, name;
  const submit = () =>
    email &&
    email.value.indexOf("@") > -1 &&
    onValidated({
      EMAIL: email.value
    });

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: 2,
        padding: 10,
        display: "inline-block"
      }}
    >
      {status === "sending" && <div style={{ color: "blue" }}>sending...</div>}
      {status === "error" && (
        <div
          style={{ color: "red" }}
          dangerouslySetInnerHTML={{ __html: message }}
        />
      )}
      {status === "success" && (
        <div
          style={{ color: "green" }}
          dangerouslySetInnerHTML={{ __html: message }}
        />
      )}
      <input
        style={{ fontSize: "1em", padding: 5, margin: 5, borderRadius: 3, border: "1px solid #555" }}
        ref={node => (email = node)}
        type="email"
        placeholder="Your email"
      />
      <br />
      <button style={{ fontSize: "1em", padding: 5, margin: 5, borderRadius: 2 }} onClick={submit}>
        Submit
      </button>
    </div>
  );
};


// use the render prop and your custom form
const SignupForm = () => (
  <>
    <br />
    <h5>Join our mailing list</h5>
    <MailchimpSubscribe
      url={url}
      render={({ subscribe, status, message }) => (
        <div>
          <CustomForm onSubmitted={formData => subscribe(formData)} />
          {status === "sending" && <div style={{ color: "blue" }}>sending...</div>}
          {status === "error" && <div style={{ color: "red" }} dangerouslySetInnerHTML={{__html: message}}/>}
          {status === "success" && <div style={{ color: "green" }}>Subscribed !</div>}
        </div>
      )}
    />
  </>
)

export default SignupForm;