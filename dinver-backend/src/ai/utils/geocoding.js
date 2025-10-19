'use strict';

const CITY_COORDINATES = {
  zagreb: { latitude: 45.815, longitude: 15.9819, name: 'Zagreb' },
  split: { latitude: 43.5081, longitude: 16.4402, name: 'Split' },
  rijeka: { latitude: 45.327, longitude: 14.4422, name: 'Rijeka' },
  osijek: { latitude: 45.5511, longitude: 18.6938, name: 'Osijek' },
  zadar: { latitude: 44.1194, longitude: 15.2314, name: 'Zadar' },
  pula: { latitude: 44.8666, longitude: 13.8496, name: 'Pula' },
  slavonski_brod: {
    latitude: 45.16,
    longitude: 18.0158,
    name: 'Slavonski Brod',
  },
  karlovac: { latitude: 45.4869, longitude: 15.5478, name: 'Karlovac' },
  varaždin: { latitude: 46.3044, longitude: 16.3377, name: 'Varaždin' },
  šibenik: { latitude: 43.7272, longitude: 15.8952, name: 'Šibenik' },
  sisak: { latitude: 45.4864, longitude: 16.3755, name: 'Sisak' },
  dubrovnik: { latitude: 42.6507, longitude: 18.0944, name: 'Dubrovnik' },
  vukovar: { latitude: 45.3511, longitude: 18.9994, name: 'Vukovar' },
  bjelovar: { latitude: 45.8986, longitude: 16.8419, name: 'Bjelovar' },
  koprivnica: { latitude: 46.1631, longitude: 16.8275, name: 'Koprivnica' },
  virovitica: { latitude: 45.8322, longitude: 17.3847, name: 'Virovitica' },
  požega: { latitude: 45.34, longitude: 17.6856, name: 'Požega' },
  vinkovci: { latitude: 45.2883, longitude: 18.8047, name: 'Vinkovci' },

  knežija: { latitude: 45.815, longitude: 15.9819, name: 'Zagreb', radius: 3 },
  knezija: { latitude: 45.815, longitude: 15.9819, name: 'Zagreb', radius: 3 },
  trnje: { latitude: 45.795, longitude: 15.99, name: 'Zagreb', radius: 3 },
  dubrava: { latitude: 45.8264, longitude: 16.0469, name: 'Zagreb', radius: 3 },
  novi_zagreb: { latitude: 45.78, longitude: 15.95, name: 'Zagreb', radius: 3 },
  centar: { latitude: 45.8131, longitude: 15.9772, name: 'Zagreb', radius: 2 },
  maksimir: {
    latitude: 45.8211,
    longitude: 16.0169,
    name: 'Zagreb',
    radius: 3,
  },
  špansko: { latitude: 45.7906, longitude: 15.9297, name: 'Zagreb', radius: 3 },
  spansko: { latitude: 45.7906, longitude: 15.9297, name: 'Zagreb', radius: 3 },
  travno: { latitude: 45.7728, longitude: 16.0194, name: 'Zagreb', radius: 3 },
  sopot: { latitude: 45.7933, longitude: 16.0389, name: 'Zagreb', radius: 3 },

  meje: { latitude: 43.515, longitude: 16.445, name: 'Split', radius: 2 },
  trstenik: { latitude: 43.5, longitude: 16.47, name: 'Split', radius: 2 },
  bačvice: { latitude: 43.5047, longitude: 16.4497, name: 'Split', radius: 2 },
  bacvice: { latitude: 43.5047, longitude: 16.4497, name: 'Split', radius: 2 },
};

function getCityCoordinates(cityName) {
  if (!cityName || typeof cityName !== 'string') {
    return null;
  }

  const normalized = cityName
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');

  const coords = CITY_COORDINATES[normalized];

  if (coords) {
    return {
      latitude: coords.latitude,
      longitude: coords.longitude,
      name: coords.name,
      radius: coords.radius || null,
    };
  }

  const fuzzyKey = Object.keys(CITY_COORDINATES).find(
    (key) => key.includes(normalized) || normalized.includes(key),
  );

  if (fuzzyKey) {
    const coords = CITY_COORDINATES[fuzzyKey];
    return {
      latitude: coords.latitude,
      longitude: coords.longitude,
      name: coords.name,
      radius: coords.radius || null,
    };
  }

  return null;
}

function addCityCoordinates(cityName, latitude, longitude) {
  const normalized = cityName
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');

  CITY_COORDINATES[normalized] = {
    latitude,
    longitude,
    name: cityName,
  };
}

function getSupportedCities() {
  return Object.values(CITY_COORDINATES).map((c) => c.name);
}

module.exports = {
  getCityCoordinates,
  addCityCoordinates,
  getSupportedCities,
  CITY_COORDINATES,
};
