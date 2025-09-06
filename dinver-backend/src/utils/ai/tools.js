module.exports = [
  {
    type: 'function',
    function: {
      name: 'check_item_in_specific_restaurant',
      description: 'Provjeri ima li određeni restoran traženo jelo.',
      parameters: {
        type: 'object',
        properties: {
          restaurantName: { type: 'string' },
          city: { type: 'string', nullable: true },
          itemName: { type: 'string' },
        },
        required: ['restaurantName', 'itemName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'find_by_item_and_perk_nearby',
      description: 'Nađi restorane blizu korisnika s jelo+perk.',
      parameters: {
        type: 'object',
        properties: {
          itemName: { type: 'string' },
          perkName: { type: 'string' },
          latitude: { type: 'number' },
          longitude: { type: 'number' },
          radiusKm: { type: 'number', nullable: true },
        },
        required: ['itemName', 'perkName', 'latitude', 'longitude'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'find_items_nearby',
      description: 'Nađi restorane blizu korisnika koji imaju traženo jelo.',
      parameters: {
        type: 'object',
        properties: {
          itemName: { type: 'string' },
          latitude: { type: 'number' },
          longitude: { type: 'number' },
          radiusKm: { type: 'number', nullable: true },
        },
        required: ['itemName', 'latitude', 'longitude'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'find_perk_nearby',
      description: 'Nađi restorane blizu korisnika s traženim perkom.',
      parameters: {
        type: 'object',
        properties: {
          perkName: { type: 'string' },
          latitude: { type: 'number' },
          longitude: { type: 'number' },
          radiusKm: { type: 'number', nullable: true },
        },
        required: ['perkName', 'latitude', 'longitude'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'find_restaurant_by_name_city',
      description: 'Nađi restoran po imenu i opcionalno gradu.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          city: { type: 'string', nullable: true },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'find_open_nearby_with_filters',
      description:
        'Nađi trenutno (ili u terminu) otvorene restorane blizu korisnika s filterima.',
      parameters: {
        type: 'object',
        properties: {
          latitude: { type: 'number' },
          longitude: { type: 'number' },
          radiusKm: { type: 'number', nullable: true },
          at: { type: 'string', nullable: true },
          foodTypes: {
            type: 'array',
            items: { type: 'string' },
            nullable: true,
          },
          dietaryTypes: {
            type: 'array',
            items: { type: 'string' },
            nullable: true,
          },
          mealTypes: {
            type: 'array',
            items: { type: 'string' },
            nullable: true,
          },
          perks: { type: 'array', items: { type: 'string' }, nullable: true },
          priceCategory: { type: 'string', nullable: true },
          establishmentTypes: {
            type: 'array',
            items: { type: 'string' },
            nullable: true,
          },
        },
        required: ['latitude', 'longitude'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'is_restaurant_open',
      description:
        'Provjeri je li restoran otvoren sada ili u zadanom terminu. Ako korisnik pita "dokad danas" ili navede vrijeme, koristi parametar at (ISO).',
      parameters: {
        type: 'object',
        properties: {
          restaurantName: { type: 'string' },
          city: { type: 'string', nullable: true },
          at: { type: 'string', nullable: true },
        },
        required: ['restaurantName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'can_i_reserve_restaurant',
      description: 'Vrati može li se rezervirati i kontakt podatke.',
      parameters: {
        type: 'object',
        properties: {
          restaurantName: { type: 'string' },
          city: { type: 'string', nullable: true },
        },
        required: ['restaurantName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'find_nearby_by_price_and_types',
      description:
        'Nađi restorane blizu korisnika po cjenovnom rangu i tipovima.',
      parameters: {
        type: 'object',
        properties: {
          latitude: { type: 'number' },
          longitude: { type: 'number' },
          radiusKm: { type: 'number', nullable: true },
          priceCategory: { type: 'string' },
          foodTypes: {
            type: 'array',
            items: { type: 'string' },
            nullable: true,
          },
          dietaryTypes: {
            type: 'array',
            items: { type: 'string' },
            nullable: true,
          },
          perks: { type: 'array', items: { type: 'string' }, nullable: true },
        },
        required: ['latitude', 'longitude', 'priceCategory'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'find_nearby_by_establishment_type',
      description:
        'Nađi restorane po establishment typu (restaurant, bar, food_truck…).',
      parameters: {
        type: 'object',
        properties: {
          latitude: { type: 'number' },
          longitude: { type: 'number' },
          radiusKm: { type: 'number', nullable: true },
          establishmentTypes: { type: 'array', items: { type: 'string' } },
        },
        required: ['latitude', 'longitude', 'establishmentTypes'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'find_nearby_with_virtual_tour',
      description: 'Nađi restorane blizu s 360/virtual tour.',
      parameters: {
        type: 'object',
        properties: {
          latitude: { type: 'number' },
          longitude: { type: 'number' },
          radiusKm: { type: 'number', nullable: true },
          foodTypes: {
            type: 'array',
            items: { type: 'string' },
            nullable: true,
          },
          perks: { type: 'array', items: { type: 'string' }, nullable: true },
        },
        required: ['latitude', 'longitude'],
      },
    },
  },
];
