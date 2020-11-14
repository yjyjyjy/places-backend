const axios = require("axios");
const HttpError = require("../models/http-error");

const API_KEY = process.env.GOOGLE_MAPS_API_KEY;

async function getCoordinatesForAddress(address) {
  const response = await axios.get(
    `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(
      address
    )}&inputtype=textquery&fields=name,geometry&key=${API_KEY}`
  );

  const data = response.data;

  if (!data || data.status !== "OK") {
    throw new HttpError(
      "Could not find the coordinate for the input address",
      404
    );
  }

  const coordinates = data.candidates[0].geometry.location;

  return coordinates;
}

module.exports = getCoordinatesForAddress;
