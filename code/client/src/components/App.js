import React, { Suspense } from "react";
import { Router } from "@reach/router";

import Home from "../pages/Home";
import Videos from "../pages/Videos";
import Concert from "../pages/Concert";
import Lessons from "../pages/Lessons";
import ConcertSuccess from "../pages/ConcertSuccess";
import AccountUpdate from "../pages/AccountUpdate";

import "../css/normalize.scss";
import "../css/eco-nav.scss";

const App = (props) => {
  console.log(props);
  return (
    <React.StrictMode>
      <Suspense fallback="loading">
        {
          // Routes for principal UI sections.
          // Concert Tickets Challenge: /concert
          // Online Video Purchase: /video
          // Online Lessons: /lessons
        }
        <Router>
          <Home path="/" {...props} />
          <Videos path="/videos" {...props} />
          <Concert path="/concert" {...props} />
          <ConcertSuccess path="/concert-success/:id" {...props} />
          <Lessons path="/lessons" {...props} />
          <AccountUpdate path="/account-update/:id" {...props} />
        </Router>
      </Suspense>
    </React.StrictMode>
  );
};

export default App;
