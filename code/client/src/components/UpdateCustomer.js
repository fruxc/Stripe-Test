import React, { useEffect, useState } from "react";
import axios from "axios";
import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Link } from "@reach/router";

const initialSignUpdata = {
  name: null,
  email: null,
  cardData: null,
  lessonData: null,
};

const backendUrl = "http://localhost:4242";

const backendCall = async (params, apiUrl = `/account-update`) => {
  return axios.request({
    baseURL: backendUrl,
    headers: { "Content-Type": "application/json" },
    responseType: "json",
    url: apiUrl, // this url will be appended to base url
    method: "post",
    data: params,
  });
};

const UpdateCustomer = (props) => {
  const { userReducer, customerId, modifyUserAction } = props;
  console.log("update props", props);
  const {
    currentUsers: { data: usersList },
  } = userReducer;
  console.log(userReducer);
  // console.log('existed users',usersList);

  const elements = useElements();
  const stripe = useStripe();

  const [userDetail, setUserDetail] = useState(null);
  const [signUpData, setsignUpData] = useState({ ...initialSignUpdata });
  const [errorMessageCard, setErrorMessageCard] = useState("");
  const [errorEmailMessage, setErrorEmailMessage] = useState("");
  const [informationUpdated, setInformationUpdated] = useState(false);
  const [disableSubmit, setDisableSubmit] = useState(false);
  const [processForm, setProcessForm] = useState(false);

  const handleChangeForm = (key, val) => {
    setErrorMessageCard("");
    setErrorEmailMessage("");
    // setDisableSubmit(false);
    setProcessForm(false);
    setInformationUpdated(false);
    setsignUpData((prevState) => {
      return { ...prevState, [key]: val };
    });
  };

  const checkSameEmail = (emailId, customerId) => {
    if (usersList !== null && usersList !== undefined && usersList.length > 0) {
      return usersList
        .filter((u) => u.id !== customerId)
        .some((d) => {
          return d.email.toLowerCase() === emailId.toLowerCase();
        });
    } else {
      return false;
    }
  };

  const handleSubmit = async () => {
    const emailExist = await checkSameEmail(signUpData.email, customerId);
    if (!emailExist) {
      const emailApiCall = await backendCall(
        { customerId, email: signUpData.email },
        "/email-exist"
      );
      if (emailApiCall.data.success) {
        if (emailApiCall.data.data === 0) {
          setDisableSubmit(true);
          setProcessForm(true);
          if (signUpData.cardData === null) {
            const customerObj = {
              name: signUpData.name,
              email: signUpData.email,
              paymentMethodId: null,
              cardData: null,
              customerId,
            };
            const response = await backendCall(
              customerObj,
              `/account-update/${customerId}`
            );
            const { data } = response;
            if (data.success) {
              setInformationUpdated(true);
              const modifiedUsers = usersList.map((u) =>
                u.id === customerId
                  ? { ...u, email: signUpData.email, name: signUpData.name }
                  : u
              );
              modifyUserAction(modifiedUsers);
            } else {
              setDisableSubmit(false);
              setErrorEmailMessage(data.error);
              setProcessForm(false);
            }
          } else {
            const { error, paymentMethod } = await stripe.createPaymentMethod({
              type: "card",
              card: elements.getElement(CardElement),
              billing_details: {
                name: signUpData.name,
                email: signUpData.email,
              },
            });
            if (!error) {
              const customerObj = {
                name: signUpData.name,
                email: signUpData.email,
                paymentMethodId: paymentMethod.id,
                cardData: paymentMethod,
                customerId,
              };
              const response = await backendCall(
                customerObj,
                `/account-update/${customerId}`
              );
              const { data } = response;
              console.log(data);
              if (data.success) {
                const confirmPayment = await stripe.confirmCardPayment(
                  data.data.payment_intent.client_secret,
                  {
                    payment_method: {
                      card: elements.getElement(CardElement),
                      billing_details: {
                        name: signUpData.name,
                      },
                    },
                  }
                );
                console.log(confirmPayment);

                if (!confirmPayment.error) {
                  if (confirmPayment.paymentIntent.status === "succeeded") {
                    const updatePaymentIntent = await backendCall(
                      {
                        paymentIntentId: confirmPayment.paymentIntent.id,
                        customerId: data.data.id,
                      },
                      "/update-payment-intent"
                    );

                    console.log(updatePaymentIntent);

                    setInformationUpdated(true);
                    // let existedUsers=JSON.parse(localStorage.getItem("users"));
                    let modifiedUsers = usersList.map((u) =>
                      u.id === customerId ? data.data : u
                    );
                    modifyUserAction(modifiedUsers);
                    // if (
                    //   existedUsers !== null &&
                    //   existedUsers !== undefined &&
                    //   existedUsers.length > 0
                    // ) {
                    //   existedUsers.push(data.data);
                    //   setUsersData(existedUsers);
                    //   addUserAction(data.data);
                    // } else {
                    //   existedUsers = [data.data];
                    //   setUsersData(existedUsers);
                    //   addUserAction(data.data);
                    // }
                  } else {
                    setDisableSubmit(false);
                    setProcessForm(false);
                    setErrorMessageCard(confirmPayment.paymentIntent.status);
                  }
                } else {
                  setDisableSubmit(false);
                  setProcessForm(false);
                  setErrorMessageCard(confirmPayment.error.message);
                }
                // localStorage.setItem("users", JSON.stringify(existedUsers))
              } else {
                setDisableSubmit(false);
                if (data.error.includes("declined")) {
                  setErrorMessageCard(data.error);
                } else {
                  setErrorEmailMessage(data.error);
                }
                setProcessForm(false);
              }
            } else {
              setErrorMessageCard(error.message);
              setProcessForm(false);
              setDisableSubmit(false);
            }
          }
        } else {
          setDisableSubmit(false);
          setErrorEmailMessage("Customer email already exists!");
          setProcessForm(false);
        }
      } else {
        setDisableSubmit(false);
        setErrorEmailMessage("Something is wrong");
        setProcessForm(false);
      }
    } else {
      setDisableSubmit(false);
      setErrorEmailMessage("Customer email already exists!");
      setProcessForm(false);
    }
  };

  useEffect(() => {
    if (signUpData.name !== null && signUpData.email !== null) {
      //if (signUpData.cardData.complete) {
      setDisableSubmit(false);
      //}
    } else {
      setDisableSubmit(true);
    }
  }, [signUpData]);

  useEffect(() => {
    const user = usersList.filter((u) => u.id === customerId);
    if (user.length > 0) {
      setUserDetail(user[0]);
      setsignUpData((prevState) => {
        return {
          ...prevState,
          name: user[0].name,
          email: user[0].email,
        };
      });
    }
  }, []);
  return (
    <div className="lesson-form">
      <div
        className={!informationUpdated ? "lesson-desc" : "lesson-desc hidden"}
      >
        <h3>Update your Payment details</h3>
        <div className="lesson-info">
          Fill out the form below if you'd like to us to use a new card.
        </div>
        <div className="lesson-grid">
          <div className="lesson-inputs">
            <div className="lesson-input-box">
              <input
                type="text"
                id="name"
                value={signUpData.name !== null ? signUpData.name : ""}
                placeholder="Name"
                autoComplete="cardholder"
                className="sr-input"
                onChange={(e) => handleChangeForm("name", e.target.value)}
              />
            </div>
            <div className="lesson-input-box">
              <input
                type="text"
                id="email"
                value={signUpData.email !== null ? signUpData.email : ""}
                placeholder="Email"
                autoComplete="cardholder"
                onChange={(e) => handleChangeForm("email", e.target.value)}
              />
            </div>
            <div className="lesson-input-box">
              <div className="lesson-card-element">
                <CardElement
                  onChange={(e) => {
                    handleChangeForm("cardData", e);
                  }}
                />
              </div>
            </div>
          </div>
          <div
            className={
              errorMessageCard !== ""
                ? "sr-field-error"
                : "sr-field-error hidden"
            }
            id="card-errors"
            role="alert"
          >
            {errorMessageCard}
          </div>
          <div
            className={
              errorEmailMessage !== ""
                ? "sr-field-error"
                : "sr-field-error hidden"
            }
            id="customer-exists-error"
            role="alert"
          >
            {errorEmailMessage}
          </div>
        </div>
        <button id="submit" onClick={handleSubmit} disabled={disableSubmit}>
          <div
            className={processForm ? "spinner" : "spinner hidden"}
            id="spinner"
          ></div>
          <span id="button-text" className={processForm ? "hidden" : null}>
            Save
          </span>
        </button>
        <div className="lesson-legal-info">
          Your new card will be charged when you book your next session.
        </div>
      </div>

      <div
        className={
          informationUpdated
            ? "sr-section completed-view"
            : "sr-section hidden completed-view"
        }
      >
        <h3 id="signup-status">Payment Information updated </h3>
        <Link to="/lessons">
          <button>Sign up for lessons under a different email address</button>
        </Link>
      </div>
    </div>
  );
};
export default UpdateCustomer;
