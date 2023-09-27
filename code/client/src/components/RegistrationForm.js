import React, { useState, useEffect } from "react";
import axios from "axios";
import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import SignupComplete from "./SignupComplete";

const backendUrl = "http://localhost:4242";

const backendCall = async (params, apiUrl = `/lessons`) => {
  return axios.request({
    baseURL: backendUrl,
    headers: { "Content-Type": "application/json" },
    responseType: "json",
    url: apiUrl, // this url will be appended to base url
    method: "post",
    data: params,
  });
};

//Registration Form Component, process user info for online session.
//const textSingUp = ;
const initialSignUpData = {
  name: null,
  email: null,
  cardData: null,
  lessonData: null,
};
const RegistrationForm = ({
  selected,
  details,
  sessions,
  addUserAction,
  userReducer,
}) => {
  const {
    currentUsers: { data: respData },
  } = userReducer;
  const elements = useElements();
  const stripe = useStripe();
  const [successSigned, setSuccessSigned] = useState({});
  const [signUpData, setSignUpData] = useState({ ...initialSignUpData });
  const [disableSubmit, setDisableSubmit] = useState(false);
  const [disableRequestLesson, setDisableRequestLesson] = useState(false);
  const [errorMessageResp, setErrorMessageResp] = useState("");
  const [btnDisable, setBtnDisable] = useState(false);
  const [usersData, setUsersData] = useState([]);
  const [customerExistedId, setCustomerExistedId] = useState(null);

  const handleChangeForm = (key, val) => {
    setErrorMessageResp("");
    setDisableSubmit(false);
    setSignUpData((prevState) => {
      return { ...prevState, [key]: val };
    });
    //console.log(key, val);
  };

  const checkSameEmail = (emailId) => {
    setCustomerExistedId(null);
    const existedEmails = respData;
    if (
      existedEmails !== null &&
      existedEmails !== undefined &&
      existedEmails.length > 0
    ) {
      return existedEmails.some((d) => {
        if (typeof d !== "object") {
          let parsedData = JSON.parse(d);
          if (parsedData.email.toLowerCase() === emailId.toLowerCase()) {
            setCustomerExistedId(parsedData.id);
            return true;
          }
          return false;
        } else {
          if (d.email.toLowerCase() === emailId.toLowerCase()) {
            setCustomerExistedId(d.id);
            return true;
          }
          return false;
        }
        // return parsedData.email.toLowerCase()==emailId.toLowerCase()
      });
    } else {
      return false;
    }
  };

  const handleSubmit = async () => {
    const emailExist = await checkSameEmail(signUpData.email);
    if (!emailExist) {
      setDisableRequestLesson(true);
      setBtnDisable(true);
      console.log("submitted", signUpData, elements.getElement(CardElement));
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: "card",
        card: elements.getElement(CardElement),
        billing_details: {
          name: signUpData.name,
          email: signUpData.email,
        },
      });
      console.log(paymentMethod);
      if (!error) {
        const customerObj = {
          name: signUpData.name,
          email: signUpData.email,
          paymentMethodId: paymentMethod.id,
          lessonData: sessions[selected],
          cardData: paymentMethod,
        };
        const response = await backendCall(customerObj);
        const { data } = response;
        // console.log(data);
        if (data.success) {
          const confirmPayment = await stripe.confirmCardSetup(
            data.data.setupIntent.client_secret,
            {
              payment_method: paymentMethod.id,
              // {
              //   card: elements.getElement(CardElement),
              //   billing_details: {
              //     name: signUpData.name,
              //   },
              // },
            }
          );
          // const confirmPayment = await stripe.confirmCardPayment(
          //   data.data.payment_intent.client_secret,
          //   {
          //     payment_method: {
          //       card: elements.getElement(CardElement),
          //       billing_details: {
          //         name: signUpData.name,
          //       },
          //     },
          //   }
          // );

          // const paymentIntent = await backendCall(
          //   { paymentIntentId: data.data.paymentIntent.id, paymentMethodID: paymentMethod.id },
          //   `/charge`
          // );
          console.log(confirmPayment);

          if (!confirmPayment.error) {
            if (confirmPayment.setupIntent.status === "succeeded") {
              // const updatePaymentIntent = await backendCall({
              //   paymentIntentId: confirmPayment.paymentIntent.id,
              //   customerId: data.data.id,
              // },'/update-payment-intent');
              // console.log(updatePaymentIntent)
              const scheduleLessonParams = {
                customer_id: data.data.id,
                //customer_id: "cus_MhNU",
                amount: 2000,
              };
              // try {
              // const scheduleLesson = await backendCall(
              //   scheduleLessonParams,
              //   "/schedule-lesson"
              // );
              // if("data" in scheduleLesson){

              //   const captureAmountParams={
              //     payment_intent_id:scheduleLesson.data.data.payment.id,
              //   }
              //   const captureAmount = await backendCall(
              //     captureAmountParams,
              //     "/complete-lesson-payment"
              //   );
              //   console.log(captureAmount)
              // }
              // console.log(scheduleLesson);
              //if ("success" in scheduleLesson) {
              setDisableRequestLesson(false);
              setBtnDisable(false);
              setSuccessSigned({
                email: customerObj.email,
                customerId: data.data.id,
                lastFour: customerObj.cardData.card.last4,
              });
              // let existedUsers=JSON.parse(localStorage.getItem("users"));
              let existedUsers = usersData;
              if (
                existedUsers !== null &&
                existedUsers !== undefined &&
                existedUsers.length > 0
              ) {
                existedUsers.push(data.data);
                setUsersData(existedUsers);
                addUserAction(data.data);
              } else {
                existedUsers = [data.data];
                setUsersData(existedUsers);
                addUserAction(data.data);
              }
              // }
              // }
            } else {
              setDisableRequestLesson(false);
              setErrorMessageResp(confirmPayment.paymentIntent.status);
            }
          } else {
            setDisableRequestLesson(false);
            setErrorMessageResp(confirmPayment.error.message);
          }
          // localStorage.setItem("users", JSON.stringify(existedUsers))
        } else {
          setDisableRequestLesson(false);
          setErrorMessageResp(data.error);
        }
      } else {
        console.log(error);
      }
    } else {
      setDisableSubmit(true);
    }
  };

  useEffect(() => {
    if (
      signUpData.name !== null &&
      signUpData.email !== null &&
      signUpData.cardData !== null
    ) {
      if (signUpData.cardData.complete) {
        setBtnDisable(false);
      }
    } else {
      setBtnDisable(true);
    }
  }, [signUpData]);

  useEffect(() => {
    console.log("resData changed", respData);
  }, [respData]);

  const urlUpdate = `http://localhost:3000/account-update/${customerExistedId}`;
  if (selected !== -1) {
    return (
      <div className={`lesson-form`}>
        <div
          className={
            Object.keys(successSigned).length > 0
              ? ` lesson-desc hidden`
              : `lesson-desc `
          }
        >
          <h3>Registration details</h3>
          <div id="summary-table" className="lesson-info">
            {details}
          </div>
          <div className="lesson-grid">
            <div className="lesson-inputs">
              <div className="lesson-input-box first">
                <input
                  type="text"
                  id="name"
                  placeholder="Name"
                  autoComplete="cardholder"
                  className="sr-input"
                  onChange={(e) => handleChangeForm("name", e.target.value)}
                />
              </div>
              <div className="lesson-input-box middle">
                <input
                  type="text"
                  id="email"
                  placeholder="Email"
                  autoComplete="cardholder"
                  onChange={(e) => handleChangeForm("email", e.target.value)}
                />
              </div>
              <div className="lesson-input-box last">
                <div className="lesson-card-element">
                  <CardElement
                    onChange={(e) => {
                      handleChangeForm("cardData", e);
                    }}
                  />
                </div>
              </div>
            </div>
            {errorMessageResp ? (
              <div className="sr-field-error" id="card-errors" role="alert">
                {errorMessageResp}
              </div>
            ) : null}
            <div
              className={
                disableSubmit ? "sr-field-error" : "sr-field-error hidden"
              }
              id="customer-exists-error"
              role="alert"
            >
              {/* A customer with the email address of {signUpData.email}
              <span id="error_msg_customer_email"></span> already exists. If
              you'd like to update the card on file, please visit
              <span id="account_link">
                http://localhost:3000/account-update/{customerExistedId}
              </span>
              . */}
              <span id="error_msg_customer_email">
                A customer with that email address already exists. If you'd like
                to update the customer
                <a id="account_link" href={urlUpdate}>
                  please visit
                </a>
              </span>
            </div>
          </div>
          <button id="submit" onClick={handleSubmit} disabled={btnDisable}>
            <div
              className={disableRequestLesson ? "spinner" : "spinner hidden"}
              id="spinner"
            ></div>
            <span
              id="button-text"
              className={disableRequestLesson ? "hidden" : null}
            >
              Request Lesson
            </span>
          </button>
          <div className="lesson-legal-info">
            Your card will not be charged. By registering, you hold a session
            slot which we will confirm within 24 hrs.
          </div>
        </div>
        {Object.keys(successSigned).length > 0 ? (
          <SignupComplete
            active={true}
            email={successSigned.email}
            last4={successSigned.lastFour}
            customer_id={successSigned.customerId}
          />
        ) : (
          <SignupComplete active={false} email="" last4="" customer_id="" />
        )}
      </div>
    );
  } else {
    return "";
  }
};
export default RegistrationForm;
