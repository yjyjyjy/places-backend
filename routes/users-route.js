const express = require("express");
const { check } = require("express-validator");
const { getUsers, signup, login } = require("../controllers/users-controller");
const fileUploader = require("../middleware/file-upload");

const router = express.Router();

router.get("/", getUsers);

router.post(
  "/signup",
  fileUploader.single("image"), // expecting a key named image
  [
    check("name").not().isEmpty(),
    check("email").normalizeEmail().isEmail(),
    check("password").isLength({ min: 6 }),
  ],
  signup
);

router.post(
  "/login",
  [
    check("email").normalizeEmail().isEmail(),
    check("password").isLength({ min: 6 }),
  ],
  login
);

module.exports = router;
