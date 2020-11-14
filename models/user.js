const mongoose = require("mongoose");
const mongooseUniqueValidator = require("mongoose-unique-validator");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  // unique create an index
  // but it does NOT guarantee the uniqueness of the field.
  password: { type: String, required: true, minlength: 6 },
  image: { type: String, required: true },
  // use [] to indicateone to many mapping 
  places: [{ type: mongoose.Types.ObjectId, required: true, ref: "Place" }], 
});

userSchema.plugin(mongooseUniqueValidator);

module.exports = mongoose.model("User", userSchema);
