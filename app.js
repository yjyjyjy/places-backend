const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const placesRoutes = require("./routes/places-route");
const usersRoutes = require("./routes/users-route");
const HttpError = require("./models/http-error");
const mongoose = require("mongoose");
const fs = require("fs"); // node.js module

const app = express();

app.use(bodyParser.json()); // json is stored at req.body property.

app.use("/uploads/images", express.static(path.join("uploads", "images")));

// add headers to overcome CORS browser check.
app.use((req, res, next) => {
  // this
  res.setHeader("Access-Control-Allow-Origin", "*"); // '*' means allow any domain to send requests.
  res.setHeader(
    "Access-Control-Allow-Headers",
    // control which headers the income request may have. could be set to *
    "Origin, X-Requested-With, Content-Type, Accept, AuthToken"
  );
  // control which methods are allowed
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE");
  next();
});

app.use("/api/places", placesRoutes);

app.use("/api/users", usersRoutes);

// handling unsupported route. This works because
app.use((req, res, next) => {
  const error = new HttpError("Could not find this route.", 404);
  throw error;
});

// handling errors thrown by previous middleware(s)
// if there are 4 input, express recognize this is an error handling middleware.
app.use((error, req, res, next) => {
  console.log(error.code);
  if (req.file) {
    fs.unlink(req.file.path, (err) => {
      console.log(err);
    });
  }
  if (res.headerSent) {
    return next(error); // async error handling.
  }
  res
    .status(error.code || 500)
    .json({ message: error.message || "An unknown error occured" });
});

mongoose
  .connect(
    `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@avalon.exhb8.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`
  )
  .then(() => {
    app.listen(5000);
  })
  .catch((error) => console.log(error));
