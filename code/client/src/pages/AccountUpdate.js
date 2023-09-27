import React, { useEffect, useState } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import Header from "../components/Header";
import "../css/lessons.scss";
import { accountUpdate } from "../Services/account";
import UpdateCustomer from "../components/UpdateCustomer";
import { useParams } from "@reach/router";
import axios from "axios";

//Component responsible to update user's info.
const AccountUpdate = (props) => {
  const backendUrl = "http://localhost:4242";

  const backendCall = async (apiUrl) => {
    return await axios.request({
      baseURL: backendUrl,
      headers: { "Content-Type": "application/json" },
      responseType: "json",
      url: apiUrl, // this url will be appended to base url
      method: "get",
    });
  };

  const { id, userReducer, modifyUserAction } = props;
  console.log(id);
  const {
    stripeKey: { data: stripeKeyData },
    currentUsers: { data: usersList },
  } = userReducer;

  const [stripePromise, setStripePromise] = useState(null);
  const [data, setData] = useState({});
  const [userDetail, setUserDetail] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const { id: customerId } = useParams();
  const getUserDetail = async (customerId) => {
    if (customerId) {
      const user = await backendCall(`/currentUser/${customerId}`);
      console.log("user", user);
      setCurrentUser(user?.data?.data);
      const existingUser = usersList.filter(
        (u) => u.id === user?.data?.data?.id
      );
      if (!existingUser.length > 0) {
        usersList.push(user?.data?.data);
        modifyUserAction(usersList);
      }
      return user;
    }
  };
  const getKey = async () => {
    const key = await backendCall(`/getKey`);
    console.log("Key", key);
    setStripePromise(loadStripe(key?.data?.data));
  };
  useEffect(() => {
    getUserDetail(customerId);
    if (stripeKeyData === "") {
      getKey();
    }
  }, [customerId, usersList, stripeKeyData]);

  useEffect(() => {
    const user = usersList.filter((u) => u.id === id);
    if (user.length > 0) {
      setUserDetail(user[0]);
    }
  }, []);

  useEffect(() => {
    const user = usersList.filter((u) => u.id === id);
    if (user.length > 0) {
      setUserDetail(user[0]);
    }
  }, [usersList]);

  //Get info to load page, User payment information, config API route in package.json "proxy"
  useEffect(() => {
    const setup = async () => {
      const result = accountUpdate(id);
      if (result !== null) {
        setData(result);
      }
    };
    setup();
  }, [id]);

  useEffect(() => {
    if (stripeKeyData !== "") {
      console.log(stripeKeyData);
      setStripePromise(loadStripe(stripeKeyData.data));
    }
  }, [stripeKeyData]);

  return (
    <main className="main-lessons">
      <Header />
      {!currentUser ? (
        <div className="spinner" id="spinner"></div>
      ) : (
        <>
          <div className="eco-items" id="account-information">
            {
              //User's info should be display here
            }
            <h3>Account Details</h3>
            <h4>Current Account information</h4>
            <h5>We have the following card information on file for you: </h5>
            <p>
              Billing Email:&nbsp;&nbsp;
              <span id="billing-email">{currentUser?.email ?? ""}</span>
            </p>
            <p>
              Card Exp Month:&nbsp;&nbsp;
              <span id="card-exp-month">
                {currentUser?.card?.card?.exp_month ?? ""}
              </span>
            </p>
            <p>
              Card Exp Year:&nbsp;&nbsp;
              <span id="card-exp-year">
                {currentUser?.card?.card?.exp_year ?? ""}
              </span>
            </p>
            <p>
              Card last 4:&nbsp;&nbsp;
              <span id="card-last4">
                {currentUser?.card?.card?.last4 ?? ""}
              </span>
            </p>
          </div>
          <Elements stripe={stripePromise}>
            <UpdateCustomer
              customerId={id}
              userReducer={{ data: { a: "!@3" } }}
              {...props}
            />
          </Elements>
        </>
      )}
    </main>
  );
};

export default AccountUpdate;
