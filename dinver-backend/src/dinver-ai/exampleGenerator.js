'use strict';

const {
  getRandomFollowup,
  getTemplate,
  formatResponse,
} = require('./responseTemplates');

/**
 * Generate contextual examples based on actual data
 * This helps the LLM understand the expected response style
 */
function generateContextualExamples(intent, data, lang) {
  const examples = [];

  switch (intent) {
    case 'nearby':
      examples.push(...generateNearbyExamples(data, lang));
      break;
    case 'menu_search':
      examples.push(...generateMenuSearchExamples(data, lang));
      break;
    case 'hours':
      examples.push(...generateHoursExamples(data, lang));
      break;
    case 'contact':
      examples.push(...generateContactExamples(data, lang));
      break;
  }

  return examples;
}

function generateNearbyExamples(data, lang) {
  const examples = [];

  if (Array.isArray(data) && data.length > 0) {
    if (data.length === 1) {
      const restaurant = data[0];
      const followup = getRandomFollowup('nearby', lang);

      examples.push({
        context: 'single_restaurant',
        example: `"${restaurant.name} je udaljen ${restaurant.distance || '0.5'} km i trenutno ${restaurant.isOpen ? 'otvoren' : 'zatvoren'}. Nalazi se na ${restaurant.address || restaurant.place}. ${followup}"`,
      });
    } else {
      const restaurantNames = data
        .slice(0, 2)
        .map((r) => `${r.name} na ${r.distance || '0.5'} km`)
        .join(', ');
      const followup = getRandomFollowup('nearby', lang);

      examples.push({
        context: 'multiple_restaurants',
        example: `"U blizini imate nekoliko opcija: ${restaurantNames}, i oba su trenutno otvorena. ${followup}"`,
      });
    }
  }

  return examples;
}

function generateMenuSearchExamples(data, lang) {
  const examples = [];

  if (data && data.isGeneralMenu && data.items && data.items.length > 0) {
    const followup = getRandomFollowup('menu_search', lang);
    const itemsText = data.items.slice(0, 3).map(item => 
      item.price ? `${item.name} (${item.price} €)` : item.name
    ).join(', ');
    examples.push({
      context: 'menu_general',
      example: `"${data.restaurant?.name || 'Restoran'} ima odličan jelovnik! Evo nekoliko naših preporuka: ${itemsText}. ${followup}"`,
    });
  } else if (data && data.menuItems && data.menuItems.length > 0) {
    const item = data.menuItems[0];
    const followup = getRandomFollowup('menu_search', lang);

    if (item.price) {
      examples.push({
        context: 'item_found_with_price',
        example: `"Da, ${data.restaurantName || 'restoran'} ima ${item.name} za ${item.price} €. ${followup}"`,
      });
    } else {
      examples.push({
        context: 'item_found_without_price',
        example: `"Da, ${data.restaurantName || 'restoran'} ima ${item.name} u svom jelovniku. ${followup}"`,
      });
    }
  } else if (data && data.restaurantName) {
    const followup = getRandomFollowup('menu_search', lang);
    examples.push({
      context: 'item_not_found',
      example: `"Nažalost, ${data.restaurantName} nema traženu stavku u svom jelovniku. ${followup}"`,
    });
  }

  return examples;
}

function generateHoursExamples(data, lang) {
  const examples = [];

  if (data && data.isClosed) {
    const followup = getRandomFollowup('hours', 'closed', lang);
    examples.push({
      context: 'hours_closed',
      example: `"${data.restaurantName || 'Restoran'} danas ne radi. ${followup}"`,
    });
  } else if (data && data.openingHours) {
    const followup = getRandomFollowup('hours', lang);
    examples.push({
      context: 'hours_available',
      example: `"${data.restaurantName || 'Restoran'} radi ponedjeljkom od 10:00 do 22:00. ${followup}"`,
    });
  } else if (data && data.restaurantName) {
    examples.push({
      context: 'hours_unavailable',
      example: `"Nažalost, nemam informacije o radnom vremenu za ${data.restaurantName}. Možete ih kontaktirati za točne informacije."`,
    });
  }

  return examples;
}

function generateContactExamples(data, lang) {
  const examples = [];

  if (data && data.phone) {
    const followup = getRandomFollowup('contact', lang);
    examples.push({
      context: 'contact_phone',
      example: `"Broj telefona za ${data.restaurantName || 'restoran'} je ${data.phone}. ${followup}"`,
    });
  }

  return examples;
}

/**
 * Generate system prompt with contextual examples
 */
function generateSystemPromptWithExamples(intent, data, lang) {
  const examples = generateContextualExamples(intent, data, lang);

  let examplesText = '';
  if (examples.length > 0) {
    examplesText = '\n\nCONTEXTUAL EXAMPLES FOR THIS QUERY:\n';
    examples.forEach((example) => {
      examplesText += `• ${example.example}\n`;
    });
    examplesText += '\nUse similar style and tone in your response.\n';
  }

  return examplesText;
}

module.exports = {
  generateContextualExamples,
  generateSystemPromptWithExamples,
};
