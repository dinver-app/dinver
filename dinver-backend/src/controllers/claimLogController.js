const { ClaimLog, Restaurant } = require('../../models');
const mailgun = require('mailgun-js');
const { format } = require('date-fns');

const mg = mailgun({
  apiKey: process.env.MAILGUN_API_KEY,
  domain: process.env.MAILGUN_DOMAIN,
});

const sendEmailNotification = async (emails, subject, text) => {
  const data = {
    from: 'Dinver <info@dinverapp.com>',
    to: emails.join(', '),
    subject: subject,
    text: text,
  };

  try {
    await mg.messages().send(data);
    console.log('Email sent successfully to multiple recipients');
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

const handleClaimStatus = async (req, res) => {
  try {
    const { restaurantId, offer, isClaimed } = req.body;
    const userId = req.user.id;

    const restaurant = await Restaurant.findByPk(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const existingClaimLog = await ClaimLog.findOne({
      where: { restaurantId },
    });

    if (isClaimed) {
      if (existingClaimLog) {
        return res.status(400).json({ error: 'restaurant_is_already_claimed' });
      }

      // Set restaurant as claimed
      await restaurant.update({ isClaimed: true });

      // Create a new claim log
      const claimLog = await ClaimLog.create({
        restaurantId,
        userId,
        offer,
      });

      const offerHR =
        offer === 'basic'
          ? 'Osnovni'
          : offer === 'premium'
            ? 'Premium'
            : 'Enterprise';

      // Send email notification
      await sendEmailNotification(
        ['ivankikic49@gmail.com'],
        'Dogovorena nova suradnja s restoranom',
        `Poštovani,\n\nS veseljem vas obavještavamo da je dogovorena nova suradnja s restoranom ${restaurant.name}.\nSuradnju je dogovorio/la ${req.user.email} dana ${format(new Date(), 'dd.MM.yyyy')} s ponudom: ${offerHR}.\n\nSrdačan pozdrav,\nDinver Team`,
      );

      return res.status(201).json({
        message: 'Suradnja s restoranom je uspješno dogovorena',
        claimLog,
      });
    } else {
      if (!existingClaimLog) {
        return res.status(400).json({ error: 'restoran_nije_dogovoren' });
      }

      // Unclaim the restaurant
      await restaurant.update({ isClaimed: false });

      // Delete the claim log
      await existingClaimLog.destroy();

      // Send email notification
      await sendEmailNotification(
        ['ivankikic49@gmail.com'],
        'Prekinuta je suradnja s restoranom',
        `Poštovani,\n\nŽelimo vas obavijestiti da je suradnja s restoranom ${restaurant.name} prekinuta.\n\nSrdačan pozdrav,\nDinver Team`,
      );

      return res
        .status(200)
        .json({ message: 'Restaurant unclaimed successfully' });
    }
  } catch (error) {
    console.error('Error handling claim status:', error);
    res.status(500).json({ error: 'Failed to handle claim status' });
  }
};

const getAllClaimLogs = async (req, res) => {
  try {
    const claimLogs = await ClaimLog.findAll();
    res.status(200).json(claimLogs);
  } catch (error) {
    console.error('Error fetching claim logs:', error);
    res.status(500).json({ error: 'Failed to fetch claim logs' });
  }
};

module.exports = {
  handleClaimStatus,
  getAllClaimLogs,
};
