const HttpError = require("../models/http-error");
const { validationResult } = require("express-validator");
const User = require("../models/user");
const dlog = require("../util/log");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const PRIVATE_KEY = process.env.AUTH_PRIVATE_KEY; // this is the private key. Never share with any client. This is dumb string tho.

const getUsers = async (req, res, next) => {
  let users;
  try {
    users = await User.find({}, "-password");
  } catch (err) {
    return next(new HttpError(`Failed to retrieve all users: ${err}`, 500));
  }

  res
    .status(200)
    .json({ users: users.map((user) => user.toObject({ getters: true })) });
};

const signup = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError("Invalid Input passed during sign Up.", 422));
  }

  const { name, email, password } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    return next(
      new HttpError(
        `Failed to validate if there is an existing user while sign up: ${err}`,
        500
      )
    );
  }

  if (existingUser) {
    return next(new HttpError("user email already registered", 401));
  }

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12); // 12 salting rounds
  } catch (err) {
    return next(new HttpError("cannot hash passowrd", 500));
  }

  const createdUser = new User({
    name,
    email,
    password: hashedPassword,
    image: req.file.path,
    places: [], // start with empty array.
  });

  try {
    await createdUser.save();
  } catch (err) {
    return next(new HttpError(`Can't save user ${err}`, 500));
  }

  let token;
  try {
    token = jwt.sign(
      { userId: createdUser.id, email: createdUser.email },
      PRIVATE_KEY,
      { expiresIn: "1h" }
    );
  } catch (err) {
    return next(new HttpError(`Signup Failed: ${err}`, 500));
  }

  res.status(201).json({
    userId: createdUser.id,
    token: token,
  });
};

const login = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError("Invalid Input passed.", 422));
  }

  if (!req.body.email || !req.body.password) {
    return next(new HttpError("invalid login request", 404));
  }

  const { email, password } = req.body;

  let user;
  let isValidPassword = false;

  try {
    user = await User.findOne({ email: email });
    isValidPassword = await bcrypt.compare(password, user.password);
  } catch (err) {
    return next(
      new HttpError(`Failed to retrieve user data during sign in: ${err}`, 500)
    );
  }

  if (!user || !isValidPassword) {
    return next(new HttpError("Incorrect email or password.", 401));
  }

  let token;
  try {
    token = jwt.sign({ userId: user.id, email: user.email }, PRIVATE_KEY, {
      expiresIn: "1h",
    });
  } catch (err) {
    return next(new HttpError(`SignIn Failed: ${err}`, 500));
  }

  res.status(200).json({
    userId: user.id,
    token: token,
    message: "Success! User logged in.",
  });
};

exports.getUsers = getUsers;
exports.signup = signup;
exports.login = login;
