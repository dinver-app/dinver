'use strict';

const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const topics = [
      {
        id: uuidv4(),
        title: 'Kako pronaći savršeni restoran za posebne prilike',
        description: 'Vodič kroz ključne faktore pri odabiru restorana za proslave, romantične večere i poslovne ručkove. Savjeti za rezervacije i pripremu.',
        targetKeywords: ['restoran', 'posebne prilike', 'rezervacija', 'romantična večera', 'proslava'],
        topicType: 'restaurant_guide',
        priority: 1,
        primaryLanguage: 'hr-HR',
        generateBothLanguages: true,
        status: 'queued',
        retryCount: 0,
        maxRetries: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        title: 'Top 5 gastro trendova u Hrvatskoj za 2025',
        description: 'Pregled najnovijih trendova u hrvatskoj gastro sceni - od lokalnih sastojaka do inovativnih tehnika kuhanja.',
        targetKeywords: ['gastro trendovi', 'hrvatska kuhinja', 'food trends', '2025', 'kulinarstvo'],
        topicType: 'food_trend',
        priority: 2,
        primaryLanguage: 'hr-HR',
        generateBothLanguages: true,
        status: 'queued',
        retryCount: 0,
        maxRetries: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        title: 'Zimski specijaliteti: Gdje probati najbolja tradicionalna jela',
        description: 'Vodič kroz restorane koji nude autentična zimska jela - od sarme i čobanaca do peke i rožate.',
        targetKeywords: ['zimska jela', 'tradicionalna hrana', 'sarma', 'peka', 'čobanac'],
        topicType: 'seasonal',
        priority: 3,
        primaryLanguage: 'hr-HR',
        generateBothLanguages: true,
        status: 'queued',
        retryCount: 0,
        maxRetries: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        title: 'Talijanska kuhinja u Zagrebu: Vodič za ljubitelje paste i pizze',
        description: 'Pregled najboljih talijanskih restorana u Zagrebu - od autentičnih tratoria do modernih pizzeria.',
        targetKeywords: ['talijanska kuhinja', 'pizza', 'pasta', 'Zagreb', 'trattoria'],
        topicType: 'cuisine_spotlight',
        priority: 4,
        primaryLanguage: 'hr-HR',
        generateBothLanguages: true,
        status: 'queued',
        retryCount: 0,
        maxRetries: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        title: 'Foodie vodič kroz Split: Od tržnice do fine dininga',
        description: 'Istraživanje gastronomske scene Splita - od svježe ribe na Peškariji do vrhunskih restorana s pogledom na more.',
        targetKeywords: ['Split', 'foodie', 'tržnica', 'fine dining', 'dalmatinska kuhinja'],
        topicType: 'neighborhood_guide',
        priority: 5,
        primaryLanguage: 'hr-HR',
        generateBothLanguages: true,
        status: 'queued',
        retryCount: 0,
        maxRetries: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        title: '5 savjeta za bolji doživljaj u restoranu',
        description: 'Praktični savjeti kako maksimalno iskoristiti posjetu restoranu - od rezervacije do davanja napojnice.',
        targetKeywords: ['savjeti', 'restoran', 'rezervacija', 'napojnica', 'dining tips'],
        topicType: 'tips',
        priority: 6,
        primaryLanguage: 'hr-HR',
        generateBothLanguages: true,
        status: 'queued',
        retryCount: 0,
        maxRetries: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        title: 'Zašto su digitalni meniji budućnost restorana',
        description: 'Analiza prednosti digitalnih menija za restorane i goste - od QR kodova do interaktivnih prikaza.',
        targetKeywords: ['digitalni meni', 'QR kod', 'tehnologija', 'inovacija', 'restaurant technology'],
        topicType: 'industry_news',
        priority: 7,
        primaryLanguage: 'hr-HR',
        generateBothLanguages: true,
        status: 'queued',
        retryCount: 0,
        maxRetries: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        title: 'Kako Dinver mijenja način na koji otkrivamo restorane',
        description: 'Predstavljanje Dinver platforme i njezinih jedinstvenih značajki za pronalazak savršenog restorana.',
        targetKeywords: ['Dinver', 'aplikacija', 'restoran', 'discovery', 'restaurant finder'],
        topicType: 'dinver_feature',
        priority: 8,
        primaryLanguage: 'hr-HR',
        generateBothLanguages: true,
        status: 'queued',
        retryCount: 0,
        maxRetries: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        title: 'Street food revolucija: Najbolji burgeri i tacos u Hrvatskoj',
        description: 'Pregled najboljih street food lokacija u Hrvatskoj - od craft burgera do autentičnih tacosa.',
        targetKeywords: ['street food', 'burgeri', 'tacos', 'fast casual', 'Croatian street food'],
        topicType: 'food_trend',
        priority: 9,
        primaryLanguage: 'hr-HR',
        generateBothLanguages: true,
        status: 'queued',
        retryCount: 0,
        maxRetries: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        title: 'Rezervacije bez stresa: Kako iskoristiti Dinver aplikaciju',
        description: 'Korak-po-korak vodič za korištenje Dinver aplikacije za jednostavne rezervacije i otkrivanje novih restorana.',
        targetKeywords: ['Dinver', 'rezervacija', 'vodič', 'tutorial', 'how to'],
        topicType: 'dinver_feature',
        priority: 10,
        primaryLanguage: 'hr-HR',
        generateBothLanguages: true,
        status: 'queued',
        retryCount: 0,
        maxRetries: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    await queryInterface.bulkInsert('BlogTopics', topics, {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('BlogTopics', null, {});
  }
};
