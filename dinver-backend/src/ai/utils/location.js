const axios = require('axios');

const FALLBACK_CITIES = {
  zagreb: { latitude: 45.815, longitude: 15.9819 },
  split: { latitude: 43.5081, longitude: 16.4402 },
  rijeka: { latitude: 45.3271, longitude: 14.4422 },
  osijek: { latitude: 45.555, longitude: 18.6955 },
  zadar: { latitude: 44.1194, longitude: 15.2314 },
  pula: { latitude: 44.8666, longitude: 13.8496 },
  dubrovnik: { latitude: 42.6507, longitude: 18.0944 },
  karlovac: { latitude: 45.487, longitude: 15.5378 },
  varaždin: { latitude: 46.3044, longitude: 16.3378 },
  šibenik: { latitude: 43.735, longitude: 15.8942 },
  sibenik: { latitude: 43.735, longitude: 15.8942 },
  'velika gorica': { latitude: 45.7117, longitude: 16.0758 },
  'slavonski brod': { latitude: 45.16, longitude: 18.0158 },
  sisak: { latitude: 45.4891, longitude: 16.3915 },
};

// Croatian city aliases and diacritics mapping
const CITY_ALIASES = {
  // Remove diacritics
  varazdin: 'varaždin',
  sibenik: 'šibenik',
  djakovo: 'đakovo',
  cazma: 'čazma',
  // Common forms
  zagrebu: 'zagreb',
  splitu: 'split',
  rijeci: 'rijeka',
  osijeku: 'osijek',
  zadru: 'zadar',
  puli: 'pula',
  dubrovniku: 'dubrovnik',
  karlovcu: 'karlovac',
  varazdinu: 'varaždin',
  sibeniku: 'šibenik',
  'velikoj gorici': 'velika gorica',
  'slavonskom brodu': 'slavonski brod',
  'velike gorice': 'velika gorica',
  'zagrebu centru': 'zagreb',
  'split centru': 'split',
};

class LocationHelper {
  constructor() {
    this.googleApiKey = process.env.GOOGLE_PLACES_API_KEY;
    this.geocodeCache = new Map();
    this.cacheExpiry = Number(process.env.GEOCODE_TTL_MS) || 30 * 60 * 1000; // 30 min default
    this.fallbackCities = FALLBACK_CITIES;
    this.cityAliases = CITY_ALIASES;
  }

  stripDiacritics(str = '') {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  normalizeCityName(cityName) {
    if (!cityName) return null;

    const raw = cityName.toLowerCase().trim();
    const noDia = this.stripDiacritics(raw); // "varaždinu" -> "varazdinu"

    // alias lookup bez i s dijakritikom
    if (this.cityAliases[noDia]) return this.cityAliases[noDia];
    if (this.cityAliases[raw]) return this.cityAliases[raw];

    // ako je fallback ključ bez dijakritike, mapiraj
    if (this.fallbackCities[raw]) return raw;
    if (this.fallbackCities[noDia]) return noDia;

    return raw; // vrati normalizirano ime (može uključiti dijakritiku)
  }

  extractCityFromQuery(queryText) {
    const query = queryText.toLowerCase();

    // English patterns: "in CityName"
    const inPattern = /\bin\s+([a-zA-ZšđčćžŠĐČĆŽ\s]+?)(?:\s|$)/i;
    const inMatch = query.match(inPattern);
    if (inMatch) {
      return this.normalizeCityName(inMatch[1].trim());
    }

    // Croatian patterns: "u/na + grad" (support multi-word cities)
    const croatianLocationPatterns = [
      /\bu\s+([a-zA-ZšđčćžŠĐČĆŽ]+(?:\s+[a-zA-ZšđčćžŠĐČĆŽ]+)*)\b/i, // u Zagrebu, u Velikoj Gorici
      /\bna\s+([a-zA-ZšđčćžŠĐČĆŽ]+(?:\s+[a-zA-ZšđčćžŠĐČĆŽ]+)*)\b/i, // na Trešnjevci
      /\biz\s+([a-zA-ZšđčćžŠĐČĆŽ]+(?:\s+[a-zA-ZšđčćžŠĐČĆŽ]+)*)\b/i, // iz Zagreba
      /\bdo\s+([a-zA-ZšđčćžŠĐČĆŽ]+(?:\s+[a-zA-ZšđčćžŠĐČĆŽ]+)*)\b/i, // do Slavonskog Broda
    ];

    for (const pattern of croatianLocationPatterns) {
      const match = query.match(pattern);
      if (match) {
        return this.normalizeCityName(match[1].trim());
      }
    }

    // Area/center patterns (fixed typo: centu -> centru)
    const areaPattern =
      /([a-zA-ZšđčćžŠĐČĆŽ\s]+?)\s+(area|center|centre|centar|centru)\b/i;
    const areaMatch = query.match(areaPattern);
    if (areaMatch) {
      return this.normalizeCityName(areaMatch[1].trim());
    }

    // Direct city mentions - fixed with case insensitive flag
    const cityPattern =
      /\b([a-zA-ZšđčćžŠĐČĆŽ]+(?:\s+[a-zA-ZšđčćžŠĐČĆŽ]+)?)\b/gi;
    const matches = query.match(cityPattern);

    if (matches) {
      // Try to find a known city from the matches
      for (const match of matches) {
        const normalized = this.normalizeCityName(match);
        if (this.fallbackCities[normalized] || this.cityAliases[normalized]) {
          return normalized;
        }
      }
    }

    return null;
  }

  async getCityCoordinates(cityName) {
    if (!cityName) return null;

    const normalizedName = this.normalizeCityName(cityName);

    const cacheKey = `geocode_${normalizedName}`;
    const cached = this.geocodeCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    if (this.googleApiKey) {
      try {
        const response = await axios.get(
          'https://maps.googleapis.com/maps/api/geocode/json',
          {
            params: {
              address: cityName,
              key: this.googleApiKey,
              language: 'hr',
              components: 'country:HR', // Prioritize Croatian results
            },
            timeout: 5000,
          },
        );

        if (response.data.status === 'OK' && response.data.results.length > 0) {
          const location = response.data.results[0].geometry.location;
          const coordinates = {
            latitude: location.lat,
            longitude: location.lng,
            formatted_address: response.data.results[0].formatted_address,
            canonicalCity: normalizedName,
            source: 'google_api',
          };

          this.geocodeCache.set(cacheKey, {
            data: coordinates,
            timestamp: Date.now(),
          });

          return coordinates;
        }
      } catch (error) {
        console.warn(
          'Geocoding API error, falling back to local data:',
          error.message,
        );
      }
    } else {
      console.warn('Google Places API key not configured, using fallback data');
    }

    if (this.fallbackCities[normalizedName]) {
      const coordinates = {
        ...this.fallbackCities[normalizedName],
        canonicalCity: normalizedName,
        source: 'fallback',
      };

      // Cache fallback result
      this.geocodeCache.set(cacheKey, {
        data: coordinates,
        timestamp: Date.now(),
      });

      return coordinates;
    }

    return null;
  }

  async analyzeLocationContext(queryText, userLocation = null) {
    const cityName = this.extractCityFromQuery(queryText);

    // Enhanced near me patterns with Croatian - check before city
    const nearMePatterns = [
      // English
      /near me/i,
      /nearby/i,
      /around here/i,
      /in my area/i,
      /close to me/i,
      // Croatian
      /u blizini/i,
      /blizu mene/i,
      /oko mene/i,
      /najbliž[eи]/i,
      /u mojoj blizini/i,
      /\bblizu\b/i,
    ];

    if (nearMePatterns.some((pattern) => pattern.test(queryText))) {
      return userLocation
        ? { type: 'user_location', coordinates: userLocation, source: 'user' }
        : { type: 'no_location', coordinates: null, source: 'none' };
    }

    // If city is found, always use it (merged duplicate logic)
    if (cityName) {
      const coords = await this.getCityCoordinates(cityName);
      return {
        type: 'city_specific',
        city: cityName,
        coordinates: coords,
        source: 'query',
      };
    }

    if (userLocation) {
      return {
        type: 'user_location',
        coordinates: userLocation,
        source: 'default',
      };
    }

    return {
      type: 'no_location',
      coordinates: null,
      source: 'none',
    };
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Math.round(distance * 100) / 100;
  }

  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  // Extract radius from text with multiple patterns (HR/EN)
  extractRadiusKm(text) {
    const patterns = [
      /\bwithin\s+(\d+)\s*km\b/i,
      /\b(?:do|up to)\s+(\d+)\s*km\b/i,
      /\bu radijusu\s+(\d+)\s*km\b/i,
      /(\d+)\s*km\b/i,
      /(\d+)\s*kilo(?:metar|metra|metara|metri)\b/i,
    ];

    for (const rx of patterns) {
      const m = text.match(rx);
      if (m) {
        const numIndex = m.length > 2 ? m.length - 2 : 1;
        return parseInt(m[numIndex] ?? m[1], 10);
      }
    }
    return null;
  }

  async getLocationParameters(queryText, userLocation = null) {
    const ctx = await this.analyzeLocationContext(queryText, userLocation);

    if (!ctx.coordinates) {
      return {};
    }

    const params = {
      latitude: ctx.coordinates.latitude,
      longitude: ctx.coordinates.longitude,
      // Add canonical city info for logging/telemetry
      place: ctx.city ?? ctx.coordinates.formatted_address ?? undefined,
    };

    const r = this.extractRadiusKm(queryText);
    params.radiusKm = r ?? (ctx.type === 'city_specific' ? 10 : undefined);

    return params;
  }

  async hasLocationMention(queryText, userLocation = null) {
    const locationContext = await this.analyzeLocationContext(
      queryText,
      userLocation,
    );
    return locationContext.type !== 'no_location';
  }

  clearCache() {
    this.geocodeCache.clear();
  }

  getCacheSize() {
    return this.geocodeCache.size;
  }
}

module.exports = LocationHelper;
