const {
  Reservation,
  ReservationEvent,
  ReservationMessage,
  User,
  Restaurant,
  UserSysadmin,
  UserAdmin,
  UserSettings,
} = require('../../models');
const { Op } = require('sequelize');
const { sendReservationEmail } = require('../../utils/emailService');
const { sendReservationSMS } = require('../../utils/smsService');
const { DateTime } = require('luxon');

const now = DateTime.now().setZone('Europe/Zagreb');
const nowTime = now.toFormat('HH:mm:ss');

// Kreiranje nove rezervacije
const createReservation = async (req, res) => {
  try {
    const { restaurantId, date, time, guests, noteFromUser } = req.body;
    const userId = req.user.id;

    // Check if user is banned
    const user = await User.findByPk(userId);
    if (user.banned) {
      return res.status(403).json({
        error:
          'Your account has been banned. You cannot create new reservations.',
      });
    }

    // Provjeri je li korisnik verificiran
    const userSettings = await UserSettings.findOne({ where: { userId } });
    if (!userSettings.isEmailVerified || !userSettings.isPhoneVerified) {
      return res.status(403).json({
        error:
          'Only verified users can make reservations. Please verify your email and phone.',
      });
    }

    // Provjeri da korisnik nema već aktivnu rezervaciju u ovom restoranu
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dateObj = new Date(date);
    dateObj.setHours(0, 0, 0, 0);

    let existingReservation;

    if (dateObj > today) {
      // Budući datum – blokiraj ako postoji aktivna rezervacija za taj datum
      existingReservation = await Reservation.findOne({
        where: {
          userId,
          restaurantId,
          date,
          status: {
            [Op.in]: ['pending', 'confirmed', 'suggested_alt'],
          },
        },
      });
    } else if (dateObj.getTime() === today.getTime()) {
      // Danas – blokiraj samo ako postoji aktivna rezervacija s vremenom u budućnosti
      existingReservation = await Reservation.findOne({
        where: {
          userId,
          restaurantId,
          date,
          time: {
            [Op.gte]: nowTime,
          },
          status: {
            [Op.in]: ['pending', 'confirmed', 'suggested_alt'],
          },
        },
      });
    } else {
      // Prošli datumi – ne blokiraj
      existingReservation = null;
    }

    if (existingReservation) {
      return res.status(400).json({
        error: 'You already have an active reservation at this restaurant.',
      });
    }

    // Provjeri je li restoran otvoren u to vrijeme
    const restaurant = await Restaurant.findByPk(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    // TODO: Dodati provjeru radnog vremena restorana

    // Kreiraj rezervaciju
    const reservation = await Reservation.create({
      userId,
      restaurantId,
      date,
      time,
      guests,
      noteFromUser,
      status: 'pending',
    });

    // Logiraj događaj
    await ReservationEvent.logEvent({
      reservationId: reservation.id,
      userId,
      event: 'created',
      newStatus: 'pending',
      metadata: { guests, noteFromUser },
    });

    // Kreiraj inicijalnu sistemsku poruku
    await ReservationMessage.createSystemMessage(
      reservation.id,
      `Nova rezervacija kreirana za ${guests} osoba`,
      {
        type: 'reservation_created',
        guests,
        date,
        time,
        noteFromUser,
      },
    );

    // Ako postoji bilješka od korisnika, dodaj je kao prvu poruku
    if (noteFromUser) {
      await ReservationMessage.create({
        reservationId: reservation.id,
        senderId: userId,
        messageType: 'user',
        content: noteFromUser,
      });
    }

    // TODO: Pošalji notifikaciju restoranu

    // Dohvati rezervaciju s porukama
    const reservationWithMessages = await Reservation.findByPk(reservation.id, {
      include: [
        {
          model: ReservationMessage,
          as: 'messages',
          include: [
            {
              model: User,
              as: 'sender',
              attributes: ['id', 'firstName', 'lastName'],
            },
          ],
          order: [['createdAt', 'ASC']],
        },
      ],
    });

    res.status(201).json(reservationWithMessages);
  } catch (error) {
    console.error('Error creating reservation:', error);
    res.status(500).json({ error: 'Failed to create reservation' });
  }
};

// Dohvaćanje rezervacija za korisnika
const getUserReservations = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, showPast = false } = req.query;

    const where = {
      userId: userId,
    };

    if (status) {
      where.status = status;
    }

    if (!showPast) {
      where.date = {
        [Op.gte]: new Date().toISOString().split('T')[0],
      };
    }

    const reservations = await Reservation.findAll({
      where,
      include: [
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name', 'address', 'place', 'phone'],
        },
        {
          model: ReservationMessage,
          as: 'messages',
          separate: true,
          order: [['createdAt', 'DESC']],
          limit: 1,
        },
      ],
      order: [
        ['date', 'DESC'],
        ['time', 'DESC'],
      ],
    });

    res.json(reservations);
  } catch (error) {
    console.error('Error fetching user reservations:', error);
    res.status(500).json({ error: 'Failed to fetch reservations' });
  }
};

// Dohvaćanje rezervacija za restoran
const getRestaurantReservations = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { status, date } = req.query;
    const userId = req.user.id;

    // Provjeri je li korisnik sysadmin
    const sysadmin = await UserSysadmin.findOne({ where: { userId } });
    if (!sysadmin) {
      // Ako nije sysadmin, provjeri je li admin/vlasnik restorana
      const userAdmin = await UserAdmin.findOne({
        where: { userId, restaurantId },
      });

      if (!userAdmin) {
        return res.status(403).json({
          error: 'Access denied. Only restaurant admins can view reservations.',
        });
      }
    }

    const where = { restaurantId };

    if (status) {
      where.status = status;
    }

    if (date) {
      where.date = date;
    }

    const reservations = await Reservation.findAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone'],
        },
      ],
      order: [
        ['date', 'ASC'],
        ['time', 'ASC'],
      ],
    });

    res.json(reservations);
  } catch (error) {
    console.error('Error fetching restaurant reservations:', error);
    res.status(500).json({ error: 'Failed to fetch reservations' });
  }
};

// Potvrda rezervacije od strane restorana
const confirmReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const { noteFromOwner } = req.body;
    const userId = req.user.id;

    const reservation = await Reservation.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone'],
        },
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name', 'address', 'place', 'phone'],
        },
      ],
    });

    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    if (!reservation.canBeResponded()) {
      return res.status(400).json({ error: 'Reservation cannot be confirmed' });
    }

    const oldStatus = reservation.status;

    await reservation.update({
      status: 'confirmed',
      noteFromOwner,
      respondedAt: new Date(),
    });

    // Logiraj događaj
    await ReservationEvent.logEvent({
      reservationId: reservation.id,
      userId,
      event: 'confirmed',
      oldStatus,
      newStatus: 'confirmed',
      metadata: { noteFromOwner },
    });

    // Kreiraj sistemsku poruku o potvrdi
    await ReservationMessage.createStatusMessage(
      reservation.id,
      userId,
      oldStatus,
      'confirmed',
    );

    // Ako postoji bilješka od vlasnika, dodaj je kao poruku
    if (noteFromOwner) {
      await ReservationMessage.create({
        reservationId: reservation.id,
        senderId: userId,
        messageType: 'user',
        content: noteFromOwner,
      });
    }

    // Pošalji email korisniku
    await sendReservationEmail({
      to: reservation.user.email,
      type: 'confirmation',
      reservation,
    });

    // Pošalji SMS korisniku samo ako ima verificiran broj telefona
    if (reservation.user.phone) {
      await sendReservationSMS({
        to: reservation.user.phone,
        type: 'confirmation',
        reservation,
      });
    }

    // Dohvati ažuriranu rezervaciju s porukama
    const updatedReservation = await Reservation.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone'],
        },
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name', 'address', 'place', 'phone'],
        },
        {
          model: ReservationMessage,
          as: 'messages',
          include: [
            {
              model: User,
              as: 'sender',
              attributes: ['id', 'firstName', 'lastName'],
            },
          ],
          order: [['createdAt', 'ASC']],
        },
      ],
    });

    res.json(updatedReservation);
  } catch (error) {
    console.error('Error confirming reservation:', error);
    res.status(500).json({ error: 'Failed to confirm reservation' });
  }
};

// Odbijanje rezervacije od strane restorana
const declineReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const { noteFromOwner } = req.body;
    const userId = req.user.id;

    const reservation = await Reservation.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone'],
        },
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name', 'address', 'place', 'phone'],
        },
      ],
    });

    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    // Provjeri je li korisnik sysadmin ili admin restorana
    const sysadmin = await UserSysadmin.findOne({ where: { userId } });
    if (!sysadmin) {
      const userAdmin = await UserAdmin.findOne({
        where: {
          userId,
          restaurantId: reservation.restaurant.id,
        },
      });

      if (!userAdmin) {
        return res.status(403).json({
          error:
            'Access denied. Only restaurant admins can decline reservations.',
        });
      }
    }

    if (!reservation.canBeResponded()) {
      return res.status(400).json({ error: 'Reservation cannot be declined' });
    }

    const oldStatus = reservation.status;

    await reservation.update({
      status: 'declined',
      noteFromOwner,
      respondedAt: new Date(),
    });

    // Logiraj događaj
    await ReservationEvent.logEvent({
      reservationId: reservation.id,
      userId,
      event: 'declined',
      oldStatus,
      newStatus: 'declined',
      metadata: { noteFromOwner },
    });

    // Pošalji email korisniku
    await sendReservationEmail({
      to: reservation.user.email,
      type: 'decline',
      reservation,
    });

    // Pošalji SMS korisniku samo ako ima verificiran broj telefona
    if (reservation.user.phone) {
      await sendReservationSMS({
        to: reservation.user.phone,
        type: 'decline',
        reservation,
      });
    }

    res.json(reservation);
  } catch (error) {
    console.error('Error declining reservation:', error);
    res.status(500).json({ error: 'Failed to decline reservation' });
  }
};

// Predlaganje alternativnog termina od strane restorana
const suggestAlternativeTime = async (req, res) => {
  try {
    const { id } = req.params;
    const { suggestedDate, suggestedTime, noteFromOwner } = req.body;
    const userId = req.user.id;

    const reservation = await Reservation.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone'],
        },
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name', 'address', 'place', 'phone'],
        },
      ],
    });

    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    if (!reservation.canBeResponded()) {
      return res.status(400).json({ error: 'Reservation cannot be modified' });
    }

    // Provjeri da korisnik nema već drugu aktivnu rezervaciju u ovom restoranu
    const existingReservation = await Reservation.findOne({
      where: {
        userId,
        restaurantId: reservation.restaurantId,
        id: { [Op.ne]: reservation.id }, // Isključi trenutnu rezervaciju
        status: {
          [Op.in]: ['pending', 'confirmed', 'suggested_alt'],
        },
      },
    });

    if (existingReservation) {
      return res.status(400).json({
        error:
          'User already has another active reservation at this restaurant. Cannot suggest alternative time.',
      });
    }

    const oldStatus = reservation.status;

    await reservation.update({
      status: 'suggested_alt',
      suggestedDate,
      suggestedTime,
      noteFromOwner,
      respondedAt: new Date(),
    });

    // Logiraj događaj
    await ReservationEvent.logEvent({
      reservationId: reservation.id,
      userId,
      event: 'suggested_alt',
      oldStatus,
      newStatus: 'suggested_alt',
      metadata: { suggestedDate, suggestedTime, noteFromOwner },
    });

    // Pošalji email korisniku
    await sendReservationEmail({
      to: reservation.user.email,
      type: 'alternative',
      reservation,
    });

    // Pošalji SMS korisniku samo ako ima verificiran broj telefona
    if (reservation.user.phone) {
      await sendReservationSMS({
        to: reservation.user.phone,
        type: 'alternative',
        reservation,
      });
    }

    res.json(reservation);
  } catch (error) {
    console.error('Error suggesting alternative time:', error);
    res.status(500).json({ error: 'Failed to suggest alternative time' });
  }
};

// Otkazivanje rezervacije od strane korisnika
const cancelReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const { cancellationReason } = req.body;
    const userId = req.user.id;

    // Check if user is banned
    const user = await User.findByPk(userId);
    if (user.banned) {
      return res.status(403).json({
        error: 'Your account has been banned. You cannot cancel reservations.',
      });
    }

    const reservation = await Reservation.findByPk(id, {
      include: [
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name', 'address', 'place'],
        },
      ],
    });

    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    if (reservation.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (!reservation.canBeCancelled()) {
      const reservationDateTime = new Date(
        reservation.date + 'T' + reservation.time,
      );
      const CANCELLATION_HOURS = 24;
      const cancellationDeadline = new Date(reservationDateTime);
      cancellationDeadline.setHours(
        cancellationDeadline.getHours() - CANCELLATION_HOURS,
      );

      if (new Date() >= cancellationDeadline) {
        return res.status(400).json({
          error:
            'Reservations can only be cancelled at least 24 hours before the reservation time',
        });
      }
      return res.status(400).json({ error: 'Reservation cannot be cancelled' });
    }

    const oldStatus = reservation.status;

    await reservation.update({
      status: 'cancelled_by_user',
      cancelledAt: new Date(),
    });

    // Logiraj događaj
    await ReservationEvent.logEvent({
      reservationId: reservation.id,
      userId,
      event: 'cancelled_by_user',
      oldStatus,
      newStatus: 'cancelled_by_user',
      metadata: { cancellationReason },
    });

    // Kreiraj sistemsku poruku o otkazivanju
    await ReservationMessage.createStatusMessage(
      reservation.id,
      userId,
      oldStatus,
      'cancelled_by_user',
      cancellationReason,
    );

    // TODO: Pošalji notifikaciju restoranu

    // Dohvati ažuriranu rezervaciju s porukama
    const updatedReservation = await Reservation.findByPk(id, {
      include: [
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name', 'address', 'place'],
        },
        {
          model: ReservationMessage,
          as: 'messages',
          include: [
            {
              model: User,
              as: 'sender',
              attributes: ['id', 'firstName', 'lastName'],
            },
          ],
          order: [['createdAt', 'ASC']],
        },
      ],
    });

    res.json(updatedReservation);
  } catch (error) {
    console.error('Error cancelling reservation:', error);
    res.status(500).json({ error: 'Failed to cancel reservation' });
  }
};

// Otkazivanje rezervacije od strane restorana
const cancelReservationByRestaurant = async (req, res) => {
  try {
    const { id } = req.params;
    const { cancellationReason } = req.body;
    const userId = req.user.id;

    if (!cancellationReason) {
      return res.status(400).json({
        error:
          'Cancellation reason is required when restaurant cancels a reservation',
      });
    }

    const reservation = await Reservation.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone'],
        },
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name', 'address', 'place'],
        },
      ],
    });

    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    // Provjeri je li korisnik admin restorana
    const isAdmin = await UserAdmin.findOne({
      where: {
        userId,
        restaurantId: reservation.restaurantId,
      },
    });

    if (!isAdmin) {
      return res.status(403).json({
        error: 'Only restaurant administrators can cancel reservations',
      });
    }

    if (!reservation.canBeRestaurantCancelled()) {
      return res.status(400).json({ error: 'Reservation cannot be cancelled' });
    }

    const oldStatus = reservation.status;

    await reservation.update({
      status: 'cancelled_by_restaurant',
      cancelledAt: new Date(),
    });

    // Logiraj događaj
    await ReservationEvent.logEvent({
      reservationId: reservation.id,
      userId,
      event: 'cancelled_by_restaurant',
      oldStatus,
      newStatus: 'cancelled_by_restaurant',
      metadata: { cancellationReason },
    });

    // Kreiraj sistemsku poruku o otkazivanju
    await ReservationMessage.createStatusMessage(
      reservation.id,
      userId,
      oldStatus,
      'cancelled_by_restaurant',
      cancellationReason,
    );

    // Pošalji email korisniku
    await sendReservationEmail({
      to: reservation.user.email,
      type: 'cancellation_by_restaurant',
      reservation: {
        ...reservation.toJSON(),
        cancellationReason,
      },
    });

    // Pošalji SMS korisniku
    if (reservation.user.phone) {
      await sendReservationSMS({
        to: reservation.user.phone,
        type: 'cancellation_by_restaurant',
        reservation: {
          ...reservation.toJSON(),
          cancellationReason,
        },
      });
    }

    // Dohvati ažuriranu rezervaciju s porukama
    const updatedReservation = await Reservation.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone'],
        },
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name', 'address', 'place'],
        },
        {
          model: ReservationMessage,
          as: 'messages',
          include: [
            {
              model: User,
              as: 'sender',
              attributes: ['id', 'firstName', 'lastName'],
            },
          ],
          order: [['createdAt', 'ASC']],
        },
      ],
    });

    res.json(updatedReservation);
  } catch (error) {
    console.error('Error cancelling reservation by restaurant:', error);
    res.status(500).json({ error: 'Failed to cancel reservation' });
  }
};

// Dohvaćanje povijesti događaja za rezervaciju
const getReservationHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const reservation = await Reservation.findByPk(id);
    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    // Provjeri je li korisnik vlasnik rezervacije ili vlasnik/admin restorana
    if (reservation.userId !== userId) {
      // TODO: Dodati provjeru je li korisnik vlasnik/admin restorana
      return res.status(403).json({ error: 'Not authorized' });
    }

    const events = await ReservationEvent.findAll({
      where: { reservationId: id },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json(events);
  } catch (error) {
    console.error('Error fetching reservation history:', error);
    res.status(500).json({ error: 'Failed to fetch reservation history' });
  }
};

// Prihvaćanje predloženog alternativnog termina od strane korisnika
const acceptSuggestedTime = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if user is banned
    const user = await User.findByPk(userId);
    if (user.banned) {
      return res.status(403).json({
        error:
          'Your account has been banned. You cannot accept alternative reservation times.',
      });
    }

    // Dohvati rezervaciju s punim podacima o korisniku i restoranu
    const reservation = await Reservation.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone'],
        },
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name', 'address', 'place'],
        },
      ],
    });

    console.log(
      'Initial reservation user:',
      JSON.stringify(reservation.user, null, 2),
    );

    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    // Provjeri je li korisnik vlasnik rezervacije
    if (reservation.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Provjeri je li rezervacija u statusu 'suggested_alt'
    if (reservation.status !== 'suggested_alt') {
      return res.status(400).json({
        error:
          'Can only accept alternative time for reservations with suggested alternative',
      });
    }

    // Provjeri da korisnik nema već drugu aktivnu rezervaciju u ovom restoranu
    const existingReservation = await Reservation.findOne({
      where: {
        userId,
        restaurantId: reservation.restaurantId,
        id: { [Op.ne]: reservation.id }, // Isključi trenutnu rezervaciju
        status: {
          [Op.in]: ['pending', 'confirmed', 'suggested_alt'],
        },
      },
    });

    if (existingReservation) {
      return res.status(400).json({
        error:
          'You already have another active reservation at this restaurant. Cannot accept alternative time.',
      });
    }

    const oldStatus = reservation.status;

    // Ažuriraj rezervaciju s predloženim terminom
    await reservation.update({
      status: 'confirmed',
      date: reservation.suggestedDate,
      time: reservation.suggestedTime,
      respondedAt: new Date(),
    });

    // Logiraj događaj
    await ReservationEvent.logEvent({
      reservationId: reservation.id,
      userId,
      event: 'accepted_alt',
      oldStatus,
      newStatus: 'confirmed',
      metadata: {
        acceptedDate: reservation.suggestedDate,
        acceptedTime: reservation.suggestedTime,
      },
    });

    // Create system message for accepting alternative
    await ReservationEvent.logEvent({
      reservationId: reservation.id,
      userId,
      event: 'accepted_alt',
      oldStatus,
      newStatus: 'confirmed',
      metadata: {
        acceptedDate: reservation.suggestedDate,
        acceptedTime: reservation.suggestedTime,
      },
    });

    // Dohvati svježe podatke o rezervaciji nakon ažuriranja
    const updatedReservation = await Reservation.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone'],
        },
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name', 'address', 'place'],
        },
      ],
    });

    // Pošalji email restoranu
    await sendReservationEmail({
      to: updatedReservation.user.email,
      type: 'accepted_alternative',
      reservation: updatedReservation,
    });

    // Pošalji SMS korisniku samo ako ima verificiran broj telefona
    if (updatedReservation.user.phone) {
      await sendReservationSMS({
        to: updatedReservation.user.phone,
        type: 'accepted_alternative',
        reservation: updatedReservation,
      });
    }

    res.json(updatedReservation);
  } catch (error) {
    console.error('Full error:', error);
    console.error('Error accepting alternative time:', error.message);
    res.status(500).json({ error: 'Failed to accept alternative time' });
  }
};

module.exports = {
  createReservation,
  getUserReservations,
  getRestaurantReservations,
  confirmReservation,
  declineReservation,
  suggestAlternativeTime,
  acceptSuggestedTime,
  cancelReservation,
  cancelReservationByRestaurant,
  getReservationHistory,
};
