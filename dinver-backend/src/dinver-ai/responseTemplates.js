'use strict';

/**
 * Response templates inspired by OpenTable and other restaurant platforms
 * These provide consistent, engaging response patterns
 */

const RESPONSE_TEMPLATES = {
  nearby: {
    single: {
      hr: {
        warm: 'U blizini se nalazi {name}, {description}. Udaljen je {distance} km i trenutno je {status}. Nalazi se na {address}. {followup}',
        neutral:
          '{name} je udaljen {distance} km i trenutno {status}. Adresa je {address}. {followup}',
      },
      en: {
        warm: "You have {name} nearby, {description}. It's just {distance} km away and currently {status}. Located at {address}. {followup}",
        neutral:
          "{name} is {distance} km away and currently {status}. It's located at {address}. {followup}",
      },
    },
    multiple: {
      hr: {
        warm: 'U blizini imate nekoliko odličnih opcija: {restaurants}. {followup}',
        neutral: 'U blizini se nalaze: {restaurants}. {followup}',
      },
      en: {
        warm: 'You have several great options nearby: {restaurants}. {followup}',
        neutral: 'Nearby you can find: {restaurants}. {followup}',
      },
    },
  },

  menu_search: {
    found: {
      hr: {
        with_price:
          'Da, {restaurant} ima {item} za {price} €. {additional_items} {followup}',
        without_price:
          'Da, {restaurant} ima {item} u svom jelovniku. {additional_items} {followup}',
      },
      en: {
        with_price:
          'Yes, {restaurant} has {item} for {price} €. {additional_items} {followup}',
        without_price:
          'Yes, {restaurant} has {item} on their menu. {additional_items} {followup}',
      },
    },
    general_menu: {
      hr: '{restaurant} ima odličan jelovnik! Evo nekoliko naših preporuka: {items}. {followup}',
      en: '{restaurant} has a great menu! Here are some of our recommendations: {items}. {followup}',
    },
    not_found: {
      hr: {
        alternative:
          'Nažalost, {restaurant} nema {item} u svom jelovniku. {alternatives} {followup}',
        no_alternative:
          'Nažalost, {restaurant} nema {item} u svom jelovniku. {followup}',
      },
      en: {
        alternative:
          "Unfortunately, {restaurant} doesn't have {item} on their menu. {alternatives} {followup}",
        no_alternative:
          "Unfortunately, {restaurant} doesn't have {item} on their menu. {followup}",
      },
    },
  },

  hours: {
    available: {
      hr: {
        single_day: '{restaurant} radi {day} od {open} do {close}. {followup}',
        multiple_days: '{restaurant} radi {schedule}. {followup}',
        closed: '{restaurant} je {day} zatvoren. {followup}',
      },
      en: {
        single_day:
          '{restaurant} is open {day} from {open} to {close}. {followup}',
        multiple_days: '{restaurant} hours are {schedule}. {followup}',
        closed: '{restaurant} is closed on {day}. {followup}',
      },
    },
    closed: {
      hr: '{restaurant} danas ne radi. {followup}',
      en: '{restaurant} is closed today. {followup}',
    },
    unavailable: {
      hr: 'Nažalost, nemam informacije o radnom vremenu za {restaurant}. Možete ih kontaktirati na {phone} za točne informacije.',
      en: "Unfortunately, I don't have information about {restaurant}'s hours. You can contact them at {phone} for accurate information.",
    },
  },

  contact: {
    hr: {
      phone: 'Broj telefona za {restaurant} je {phone}. {followup}',
      email: 'Email adresa za {restaurant} je {email}. {followup}',
      website: 'Web stranica za {restaurant} je {website}. {followup}',
      multiple:
        'Kontakt informacije za {restaurant}: telefon {phone}, email {email}. {followup}',
    },
    en: {
      phone: 'The phone number for {restaurant} is {phone}. {followup}',
      email: 'The email for {restaurant} is {email}. {followup}',
      website: 'The website for {restaurant} is {website}. {followup}',
      multiple:
        'Contact information for {restaurant}: phone {phone}, email {email}. {followup}',
    },
  },
};

const FOLLOWUP_QUESTIONS = {
  nearby: {
    hr: [
      'Želite li više informacija o jelovniku ili radnom vremenu?',
      'Koji vam se čini najzanimljiviji?',
      'Trebate li rezervaciju?',
      'Želite li znati više o cijenama?',
      'Ima li nešto specifično što tražite?',
    ],
    en: [
      'Would you like to know more about their menu or hours?',
      'Which one interests you most?',
      'Do you need a reservation?',
      'Would you like to know about their prices?',
      "Is there something specific you're looking for?",
    ],
  },
  menu_search: {
    hr: [
      'Želite li znati više o sastojcima?',
      'Ima li nešto drugo što vas zanima?',
      'Trebate li informacije o cijenama?',
      'Želite li vidjeti cijeli jelovnik?',
      'Ima li nešto slično što bi vas zanimalo?',
    ],
    en: [
      'Would you like to know more about the ingredients?',
      'Is there anything else that interests you?',
      'Do you need information about prices?',
      'Would you like to see the full menu?',
      'Is there something similar that might interest you?',
    ],
  },
  hours: {
    hr: [
      'Trebate li rezervaciju?',
      'Želite li znati više o jelovniku?',
      'Ima li nešto drugo što vas zanima?',
      'Trebate li kontakt informacije?',
    ],
    closed: {
      hr: [
        'Želite li znati kada će biti otvoreni?',
        'Trebate li kontakt informacije?',
        'Ima li nešto drugo što vas zanima?',
        'Želite li vidjeti jelovnik za sljedeći put?',
      ],
      en: [
        'Would you like to know when they will be open?',
        'Do you need contact information?',
        'Is there anything else that interests you?',
        'Would you like to see the menu for next time?',
      ],
    },
    en: [
      'Do you need a reservation?',
      'Would you like to know about their menu?',
      'Is there anything else that interests you?',
      'Do you need contact information?',
    ],
  },
  contact: {
    hr: [
      'Trebate li još nešto?',
      'Želite li znati više o restoranu?',
      'Ima li nešto drugo što vas zanima?',
    ],
    en: [
      'Do you need anything else?',
      'Would you like to know more about the restaurant?',
      'Is there anything else that interests you?',
    ],
  },
};

/**
 * Get a random followup question for the given intent and language
 */
function getRandomFollowup(intent, context, lang) {
  const questions =
    FOLLOWUP_QUESTIONS[intent]?.[context]?.[lang] ||
    FOLLOWUP_QUESTIONS[intent]?.[lang] ||
    [];
  return questions[Math.floor(Math.random() * questions.length)] || '';
}

/**
 * Get response template for the given context
 */
function getTemplate(intent, context, lang) {
  const templates = RESPONSE_TEMPLATES[intent]?.[context]?.[lang];
  return templates || null;
}

/**
 * Format a response using template and data
 */
function formatResponse(template, data) {
  if (!template) return null;

  let response = template;
  Object.keys(data).forEach((key) => {
    const value = data[key] || '';
    response = response.replace(new RegExp(`{${key}}`, 'g'), value);
  });

  return response;
}

module.exports = {
  RESPONSE_TEMPLATES,
  FOLLOWUP_QUESTIONS,
  getRandomFollowup,
  getTemplate,
  formatResponse,
};
