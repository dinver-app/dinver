const twilio = require('twilio');
const { format } = require('date-fns');

// Twilio konfiguracija
const twilioClient = process.env.TWILIO_ACCOUNT_SID
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

const formatDate = (dateStr) => {
  return format(new Date(dateStr), 'dd.MM.yyyy.');
};

const formatTime = (timeStr) => {
  return timeStr.substring(0, 5); // Format HH:mm from HH:mm:ss
};

const sendVerificationSMS = async (phone, code) => {
  if (process.env.NODE_ENV === 'development' || !twilioClient) {
    console.log('Development mode: SMS would be sent');
    console.log('To:', phone);
    console.log('Verification Code:', code);
    return;
  }

  try {
    await twilioClient.messages.create({
      body: `Your Dinver verification code is: ${code}. This code will expire in 10 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });
    console.log('Verification SMS sent successfully');
  } catch (error) {
    console.error('Error sending verification SMS:', error);
    throw error;
  }
};

const sendReservationSMS = async ({ to, type, reservation }) => {
  if (!to) {
    console.error('No phone number provided for SMS');
    return;
  }

  const formattedDate = formatDate(reservation.date);
  const formattedTime = formatTime(reservation.time);
  const formattedSuggestedDate = reservation.suggestedDate
    ? formatDate(reservation.suggestedDate)
    : null;
  const formattedSuggestedTime = reservation.suggestedTime
    ? formatTime(reservation.suggestedTime)
    : null;

  let message;

  switch (type) {
    case 'confirmation':
      message = `Vaša rezervacija u restoranu "${reservation.restaurant.name}" za ${formattedDate} u ${formattedTime} je potvrđena. Broj gostiju: ${reservation.guests}`;
      break;
    case 'decline':
      message = `Vaša rezervacija u restoranu "${reservation.restaurant.name}" za ${formattedDate} u ${formattedTime} je odbijena.`;
      if (reservation.noteFromOwner) {
        message += ` Razlog: ${reservation.noteFromOwner}`;
      }
      break;
    case 'alternative':
      message = `Restoran "${reservation.restaurant.name}" predlaže alternativni termin za vašu rezervaciju: ${formattedSuggestedDate} u ${formattedSuggestedTime}.`;
      break;
    case 'cancellation':
      message = `Vaša rezervacija u restoranu "${reservation.restaurant.name}" za ${formattedDate} u ${formattedTime} je otkazana.`;
      break;
    case 'cancellation_by_restaurant':
      message = `Vaša rezervacija u restoranu "${reservation.restaurant.name}" za ${formattedDate} u ${formattedTime} je otkazana od strane restorana.`;
      if (reservation.cancellationReason) {
        message += ` Razlog: ${reservation.cancellationReason}`;
      }
      break;
    default:
      throw new Error('Invalid SMS type');
  }

  if (process.env.NODE_ENV === 'development' || !twilioClient) {
    console.log('Development mode: SMS would be sent');
    console.log('To:', to);
    console.log('Message:', message);
    return;
  }

  try {
    await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to,
    });
    console.log('Reservation SMS sent successfully');
  } catch (error) {
    console.error('Error sending reservation SMS:', error);
    throw error;
  }
};

module.exports = {
  sendVerificationSMS,
  sendReservationSMS,
};
