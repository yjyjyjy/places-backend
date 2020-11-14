const HttpError = require("../models/http-error");
const { validationResult } = require("express-validator");
const getCoordinatesForAddress = require("../util/location");
const Place = require("../models/place");
const User = require("../models/user");
const mongoose = require("mongoose");
const dlog = require("../util/log");
const fs = require("fs"); // node.js module
const { Console } = require("console");

const getPlaceById = async (req, res, next) => {
  const placeId = req.params.pid; // {pid:'p1'}
  let place;
  try {
    place = await Place.findById(placeId); // static method
  } catch (err) {
    return next(
      new HttpError("Something went wrong, could not find the place", 500)
    );
  }

  if (!place) {
    return next(
      new HttpError("Could not find a place for the provided place id.", 404)
    );
  }

  res.json({ place: place.toObject({ getters: true }) });
};

const getPlacesByUserId = async (req, res, next) => {
  const userId = req.params.uid;
  let user;
  try {
    user = await User.findById(userId).populate("places");
  } catch (err) {
    return next(new HttpError("fetching place by user id failed.", 500));
  }

  const places = user.places;

  if (!places || places.length == 0) {
    res.json({
      places: [],
    });
  }

  res.json({
    places: places.map((place) => place.toObject({ getters: true })),
  });
};

const createPlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    next(new HttpError("Invalid Input passed.", 422));
  }

  const { title, description, address } = req.body;
  const creator = req.userData.userId; // this is the user ID extracted from the auth Token
  let user;
  try {
    user = await User.findById(creator);
  } catch (err) {
    return next(
      new HttpError(
        `Failed to check creator existance while creating place: ${err}`,
        500
      )
    );
  }

  if (!user) {
    return next(new HttpError(`creator doesn't exist`, 404));
  }

  let location; // so the scope of location is outside the try block
  try {
    location = await getCoordinatesForAddress(address);
  } catch (error) {
    return next(error);
  }

  const createdPlace = new Place({
    title,
    description,
    address,
    location,
    image: req.file.path,
    creator,
  });

  try {
    // in transaction places collection won't be automatically created. Needs to be there somehow before this.
    const session = await mongoose.startSession();
    session.startTransaction();
    await createdPlace.save({ session });
    user.places.push(createdPlace);
    await user.save({ session });
    await session.commitTransaction();
  } catch (err) {
    const error = new HttpError(`Creating place failed: ${err}`, 500);
    return next(error);
  }

  res
    .status(201)
    .json({ createdPlace: createdPlace.toObject({ getters: true }) });
};

const updatePlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError("Invalid Input passed.", 422));
  }

  const placeId = req.params.pid; // {pid:'p1'}

  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    return next(
      new HttpError(
        `Something went wrong, could not find the place ${err}`,
        500
      )
    );
  }

  if (!place) {
    return next(
      new HttpError("Could not find a place for the provided place id.", 404)
    );
  }

  if (place.creator.toString() !== req.userData.userId) {
    return next(new HttpError(`Not from authroized user: ${err}`, 401));
  }

  const { title, description } = req.body;

  place.title = title;
  place.description = description;

  try {
    await place.save();
  } catch (err) {
    return next(new HttpError(`Failed to update the place: ${err}`, 500));
  }

  res.status(200).json({ place });
};

const deletePlace = async (req, res, next) => {
  const placeId = req.params.pid;

  let place;
  try {
    place = await Place.findById(placeId).populate("creator");
    // populate the creator field in the place document from id to the actual creator object.
  } catch (err) {
    return next(
      new HttpError(`Failed to validate the place to be deleted: ${err}`, 500)
    );
  }

  if (!place) {
    return next(new HttpError(`Failed to find the place to be deleted`, 404));
  }

  // check authorization
  if (place.creator.id !== req.userData.userId) {
    return next(new HttpError(`Not from authroized user: ${err}`, 401));
  }

  try {
    const session = await mongoose.startSession();
    session.startTransaction();
    await place.remove({ session });
    place.creator.places.pull(place); // mongoose mehtod to remove from an array.
    await place.creator.save({ session });
    await session.commitTransaction();
    if (!!place.image) {
      fs.unlink(place.image, (err) => {
        console.log(err);
      });
    }
  } catch (err) {
    dlog(err);
    return next(new HttpError(`Failed to delete the place: ${err}`, 500));
  }

  res.status(200).json({ message: "Place Deleted" });
};

exports.getPlaceById = getPlaceById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;
