'use strict';

const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert(
      'Reviews',
      [
        {
          id: uuidv4(),
          user_id: '5096c695-d129-4018-9551-16c9f5376867',
          restaurant_id: 'afa39392-2919-4c10-8f85-94c045aad9db',
          rating: 4.5,
          comment: 'Great food and atmosphere!',
          images: [
            'https://media.istockphoto.com/id/1316145932/photo/table-top-view-of-spicy-food.jpg?s=612x612&w=0&k=20&c=eaKRSIAoRGHMibSfahMyQS6iFADyVy1pnPdy1O5rZ98=',
            'https://www.shutterstock.com/image-photo/fried-salmon-steak-cooked-green-600nw-2489026949.jpg',
          ],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: uuidv4(),
          user_id: '550e8400-e29b-41d4-a716-446655440000',
          restaurant_id: 'afa39392-2919-4c10-8f85-94c045aad9db',
          rating: 3.0,
          comment: null,
          images: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: uuidv4(),
          user_id: '652d61de-038c-4ed0-9101-7513aec8ec58',
          restaurant_id: 'afa39392-2919-4c10-8f85-94c045aad9db',
          rating: 5.0,
          comment: 'Absolutely loved it!',
          images: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: uuidv4(),
          user_id: '652d61de-038c-4ed0-9101-7513aec8ec58',
          restaurant_id: 'afa39392-2919-4c10-8f85-94c045aad9db',
          rating: 2.5,
          comment: 'Not what I expected.',
          images: [
            'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg',
          ],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: uuidv4(),
          user_id: '652d61de-038c-4ed0-9101-7513aec8ec58',
          restaurant_id: 'afa39392-2919-4c10-8f85-94c045aad9db',
          rating: 4.0,
          comment: 'Good service, will come again.',
          images: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      {},
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Reviews', null, {});
  },
};
