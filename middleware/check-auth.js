const HttpError = require("../models/http-error");
const jwt = require("jsonwebtoken");
const PRIVATE_KEY = process.env.AUTH_PRIVATE_KEY;

module.exports = (req, res, next) => {
  if (req.method === "OPTIONS") {
    return next();
  }

  try {
    const token = req.headers.authtoken; //.split(" ")[1]; // Authrozation: 'Bearer TOKENSTRING' << seems stupid.
    // the token can't be in the request body because not all requests have body.
    if (!token) {
      throw new Error();
    }
    const decodedToken = jwt.verify(token, PRIVATE_KEY); // return the payload that was encoded into the token (not a boolean)
    req.userData = { userId: decodedToken.userId }; // creating a userData property to the req object.
    next();
  } catch (error) {
    return next(new HttpError("Auth Failed!", 401));
  }
};
