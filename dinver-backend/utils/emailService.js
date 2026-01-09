const { format } = require('date-fns');
const crypto = require('crypto');
const { sendEmail } = require('./mailgunClient');

const formatDate = (dateStr) => {
  return format(new Date(dateStr), 'dd.MM.yyyy.');
};

const formatTime = (timeStr) => {
  return timeStr.substring(0, 5); // Format HH:mm from HH:mm:ss
};

// Generate RFC 2822-compliant Message-ID for a given domain
const generateMessageId = (domain = 'dinver.eu') => {
  const id = crypto.randomBytes(16).toString('hex');
  return `<${id}@${domain}>`;
};

// Create a plain-text approximation from HTML for better spam scoring
const htmlToPlainText = (html) => {
  if (!html) return '';
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<\/?(br|p|div|li|tr|h[1-6])[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

// Attach anti-spam headers and Mailgun options
const addAntiSpamHeaders = (data, { refId }) => {
  const headers = {
    'h:Message-ID': generateMessageId(),
    'h:Reply-To': 'support@dinver.eu',
    // While List-Unsubscribe is typically for marketing, adding it improves deliverability signals.
    'h:List-Unsubscribe': '<mailto:support@dinver.eu?subject=unsubscribe>',
  };

  return {
    ...data,
    ...headers,
    'h:X-Entity-Ref-ID': refId || `ref-${Date.now()}`,
    'o:dkim': 'yes',
    'o:tracking': 'yes',
    'o:tracking-clicks': 'yes',
    'o:tracking-opens': 'yes',
  };
};

// Premium HTML email template with dark mode support
const createPremiumEmailTemplate = (content) => {
  return `
    <!DOCTYPE html>
    <html lang="hr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="color-scheme" content="light dark">
      <meta name="supported-color-schemes" content="light dark">
      <title>Dinver</title>
      <style>
        /* Reset and base styles */
        * {
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #1a1a1a;
          margin: 0;
          padding: 0;
          background-color: #ffffff;
          -webkit-text-size-adjust: 100%;
          -ms-text-size-adjust: 100%;
        }
        
        /* Dark mode styles */
        @media (prefers-color-scheme: dark) {
          body {
            background-color: #1a1a1a;
            color: #ffffff;
          }
          .container {
            background-color: #2d2d2d;
            border: 1px solid #404040;
          }
          .header {
            background-color: #1a1a1a !important;
            border-bottom: 1px solid #404040;
          }
          .logo {
            color: #ffffff !important;
          }
          .content {
            background-color: #2d2d2d;
          }
          .card {
            background-color: #404040;
            border: 1px solid #555555;
          }
          .button {
            background-color: #0C5A48 !important;
            color: #ffffff !important;
          }
          .button:hover {
            background-color: #0a4a3a !important;
            color: #ffffff !important;
          }
          .button:visited {
            color: #ffffff !important;
          }
          .button:active {
            color: #ffffff !important;
          }
          .footer {
            background-color: #1a1a1a;
            border-top: 1px solid #404040;
            color: #cccccc;
          }
          .footer a {
            color: #0C5A48;
          }
          .link-container {
            background-color: #404040;
            border: 1px solid #555555;
            color: #cccccc;
          }
          h2, h3 {
            color: #ffffff;
          }
          .text-muted {
            color: #999999;
          }
        }
        
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
          border: 1px solid #e5e7eb;
        }
        
        .header {
          background-color: #ffffff;
          padding: 32px 24px 24px;
          text-align: center;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .logo {
          font-size: 32px;
          font-weight: 700;
          letter-spacing: -0.5px;
          color: #1a1a1a;
          margin: 0;
        }
        
        .content {
          padding: 40px 32px;
          background-color: #ffffff;
        }
        
        .card {
          background-color: #f9fafb;
          border-radius: 8px;
          padding: 24px;
          margin: 24px 0;
          border: 1px solid #e5e7eb;
        }
        
        .button {
          display: inline-block;
          background-color: #0C5A48;
          color: #ffffff !important;
          padding: 16px 32px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 16px;
          margin: 24px 0;
          text-align: center;
          border: 0;
          transition: background-color 0.2s ease;
        }
        
        .button:hover {
          background-color: #0a4a3a;
          color: #ffffff !important;
        }
        
        .button:visited {
          color: #ffffff !important;
        }
        
        .button:active {
          color: #ffffff !important;
        }
        
        .button-large {
          padding: 18px 40px;
          font-size: 18px;
        }
        
        .footer {
          background-color: #f9fafb;
          padding: 32px 24px;
          text-align: center;
          color: #6b7280;
          font-size: 14px;
          border-top: 1px solid #e5e7eb;
        }
        
        .footer p {
          margin: 8px 0;
        }
        
        .footer a {
          color: #0C5A48;
          text-decoration: none;
        }
        
        h1 {
          font-size: 28px;
          font-weight: 700;
          color: #1a1a1a;
          margin: 0 0 16px 0;
          line-height: 1.3;
        }
        
        h2 {
          font-size: 24px;
          font-weight: 600;
          color: #1a1a1a;
          margin: 0 0 16px 0;
          line-height: 1.3;
        }
        
        h3 {
          font-size: 18px;
          font-weight: 600;
          color: #1a1a1a;
          margin: 0 0 12px 0;
        }
        
        p {
          margin: 0 0 16px 0;
          font-size: 16px;
          line-height: 1.6;
        }
        
        .text-muted {
          color: #6b7280;
          font-size: 14px;
        }
        
        .link-container {
          word-break: break-all;
          margin: 16px 0;
          padding: 16px;
          background-color: #f3f4f6;
          border-radius: 6px;
          font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
          font-size: 14px;
          border: 1px solid #e5e7eb;
        }
        
        .detail-row {
          display: flex;
          align-items: center;
          margin: 12px 0;
          padding: 8px 0;
        }
        
        .detail-label {
          font-weight: 600;
          color: #374151;
          min-width: 120px;
          margin-right: 16px;
        }
        
        .detail-value {
          color: #1a1a1a;
          flex: 1;
        }
        
        .icon {
          width: 20px;
          height: 20px;
          margin-right: 12px;
          opacity: 0.7;
        }
        
        .text-center {
          text-align: center;
        }
        
        .mb-0 {
          margin-bottom: 0;
        }
        
        .mt-0 {
          margin-top: 0;
        }
        
        @media only screen and (max-width: 600px) {
          .container {
            width: 100%;
            border-radius: 0;
            margin: 0;
          }
          .content {
            padding: 24px 20px;
          }
          .header {
            padding: 24px 20px 20px;
          }
          .footer {
            padding: 24px 20px;
          }
          .logo {
            font-size: 28px;
          }
          h1 {
            font-size: 24px;
          }
          h2 {
            font-size: 20px;
          }
          .button {
            padding: 14px 28px;
            font-size: 16px;
          }
          .detail-row {
            flex-direction: column;
            align-items: flex-start;
          }
          .detail-label {
            min-width: auto;
            margin-right: 0;
            margin-bottom: 4px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">Dinver</div>
        </div>
        <div class="content">
          ${content}
        </div>
        <div class="footer">
          <p class="mb-0">&copy; ${new Date().getFullYear()} Dinver. Sva prava pridržana.</p>
          <p class="mb-0">Dinver je moderna platforma za pronalazak i odabir restorana.</p>
          <p class="mb-0 mt-0">
            <a href="mailto:support@dinver.eu?subject=unsubscribe">Odjavi se</a> | 
            <a href="mailto:support@dinver.eu">Kontakt</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Legacy template for backward compatibility
const createEmailTemplate = (content) => {
  return createPremiumEmailTemplate(content);
};

const sendVerificationEmail = async (email, verificationLink) => {
  const htmlContent = `
    <div class="text-center">
      <h1>Dobrodošli u Dinver!</h1>
      <p>Hvala vam što ste se registrirali. Da biste aktivirali svoj račun, molimo potvrdite svoju e-mail adresu.</p>
      
      <div style="margin: 32px 0;">
        <a href="${verificationLink}" class="button button-large">Potvrdi e-mail adresu</a>
      </div>
      
      <p class="text-muted">Ovaj link će isteći za 24 sata.</p>
      
      <div class="card" style="margin-top: 32px;">
        <p class="text-muted mb-0">Ako gumb ne radi, kopirajte i zalijepite ovaj link u svoj preglednik:</p>
        <div class="link-container">
          ${verificationLink}
        </div>
      </div>
      
      <p class="text-muted">Ako niste kreirali račun, možete sigurno ignorirati ovaj e-mail.</p>
    </div>
  `;

  let data = {
    from: 'Dinver <noreply@dinver.eu>',
    to: email,
    subject: 'Potvrda vaše e-mail adrese',
    text: `Dobrodošli u Dinver! Molimo potvrdite Vašu e-mail adresu klikom na sljedeći link: ${verificationLink}. Ovaj link će isteći za 24 sata.`,
    html: createEmailTemplate(htmlContent),
  };

  // Ensure text version is robust
  if (!data.text || data.text.length < 40) {
    data.text = htmlToPlainText(htmlContent);
  }

  // Add headers and Mailgun options
  data = addAntiSpamHeaders(data, { refId: `verify-${Date.now()}` });

  try {
    await sendEmail({
      from: data.from,
      to: data.to,
      subject: data.subject,
      text: data.text,
      html: data.html,
      headers: {
        'Message-ID': data['h:Message-ID'],
        'Reply-To': data['h:Reply-To'],
        'List-Unsubscribe': data['h:List-Unsubscribe'],
        'X-Entity-Ref-ID': data['h:X-Entity-Ref-ID'],
      },
      options: {
        dkim: data['o:dkim'],
        tracking: data['o:tracking'],
        'tracking-clicks': data['o:tracking-clicks'],
        'tracking-opens': data['o:tracking-opens'],
      },
    });
    console.log('Verification email sent successfully');
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw error;
  }
};

const sendReservationEmail = async ({ to, type, reservation }) => {
  let subject;
  let text;
  let htmlContent;

  const formattedDate = formatDate(reservation.date);
  const formattedTime = formatTime(reservation.time);
  const formattedSuggestedDate = reservation.suggestedDate
    ? formatDate(reservation.suggestedDate)
    : null;
  const formattedSuggestedTime = reservation.suggestedTime
    ? formatTime(reservation.suggestedTime)
    : null;

  switch (type) {
    case 'confirmation':
      subject = 'Rezervacija potvrđena';
      text =
        `Vaša rezervacija u restoranu "${reservation.restaurant.name}" za ${formattedDate} u ${formattedTime} je potvrđena.\n\n` +
        `Detalji rezervacije:\n` +
        `Restoran: "${reservation.restaurant.name}"\n` +
        `Datum: ${formattedDate}\n` +
        `Vrijeme: ${formattedTime}\n` +
        `Broj gostiju: ${reservation.guests}\n` +
        (reservation.noteFromOwner
          ? `Poruka od restorana: ${reservation.noteFromOwner}\n`
          : '');

      htmlContent = `
        <div class="text-center">
          <h1>✅ Rezervacija potvrđena</h1>
          <p>Vaša rezervacija je uspješno potvrđena!</p>
        </div>
        
        <div class="card">
          <h3 style="margin-top: 0;">${reservation.restaurant.name}</h3>
          <div class="detail-row">
            <span class="detail-label">📅 Datum:</span>
            <span class="detail-value">${formattedDate}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">🕐 Vrijeme:</span>
            <span class="detail-value">${formattedTime}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">👥 Broj gostiju:</span>
            <span class="detail-value">${reservation.guests}</span>
          </div>
          ${
            reservation.noteFromOwner
              ? `
          <div class="detail-row">
            <span class="detail-label">💬 Poruka:</span>
            <span class="detail-value">${reservation.noteFromOwner}</span>
          </div>
          `
              : ''
          }
        </div>
        
        <div class="text-center">
          <p>Veselimo se vašem dolasku!</p>
          <p class="text-muted">Ako imate pitanja, kontaktirajte restoran direktno.</p>
        </div>
      `;
      break;

    case 'decline':
      subject = 'Rezervacija odbijena';
      text =
        `Nažalost, vaša rezervacija u restoranu "${reservation.restaurant.name}" za ${formattedDate} u ${formattedTime} je odbijena.\n` +
        (reservation.noteFromOwner
          ? `\nRazlog: ${reservation.noteFromOwner}`
          : '');

      htmlContent = `
        <div class="text-center">
          <h1>❌ Rezervacija odbijena</h1>
          <p>Nažalost, vaša rezervacija nije mogla biti prihvaćena.</p>
        </div>
        
        <div class="card">
          <h3 style="margin-top: 0;">${reservation.restaurant.name}</h3>
          <div class="detail-row">
            <span class="detail-label">📅 Datum:</span>
            <span class="detail-value">${formattedDate}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">🕐 Vrijeme:</span>
            <span class="detail-value">${formattedTime}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">👥 Broj gostiju:</span>
            <span class="detail-value">${reservation.guests}</span>
          </div>
          ${
            reservation.noteFromOwner
              ? `
          <div class="detail-row">
            <span class="detail-label">💬 Razlog:</span>
            <span class="detail-value">${reservation.noteFromOwner}</span>
          </div>
          `
              : ''
          }
        </div>
        
        <div class="text-center">
          <p>Pozivamo vas da pokušate rezervirati drugi termin ili drugi restoran putem Dinver platforme.</p>
          <p class="text-muted">Hvala vam na razumijevanju.</p>
        </div>
      `;
      break;

    case 'alternative':
      subject = 'Prijedlog alternativnog termina rezervacije';
      text =
        `Restoran "${reservation.restaurant.name}" predlaže alternativni termin za vašu rezervaciju:\n` +
        `Novi datum: ${formattedSuggestedDate}\n` +
        `Novo vrijeme: ${formattedSuggestedTime}\n\n` +
        `${reservation.noteFromOwner ? `Poruka od restorana: ${reservation.noteFromOwner}\n` : ''}` +
        `Molimo vas da potvrdite ili odbijete ovaj prijedlog kroz aplikaciju.`;

      htmlContent = `
        <div class="text-center">
          <h1>🔄 Prijedlog alternativnog termina</h1>
          <p>Restoran predlaže alternativni termin za vašu rezervaciju.</p>
        </div>
        
        <div class="card">
          <h3 style="margin-top: 0;">${reservation.restaurant.name}</h3>
          <div class="detail-row">
            <span class="detail-label">📅 Novi datum:</span>
            <span class="detail-value">${formattedSuggestedDate}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">🕐 Novo vrijeme:</span>
            <span class="detail-value">${formattedSuggestedTime}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">👥 Broj gostiju:</span>
            <span class="detail-value">${reservation.guests}</span>
          </div>
          ${
            reservation.noteFromOwner
              ? `
          <div class="detail-row">
            <span class="detail-label">💬 Poruka:</span>
            <span class="detail-value">${reservation.noteFromOwner}</span>
          </div>
          `
              : ''
          }
        </div>
        
        <div class="text-center">
          <p>Molimo vas da potvrdite ili odbijete ovaj prijedlog kroz Dinver aplikaciju.</p>
          <p class="text-muted">Imate ograničeno vrijeme za odgovor.</p>
        </div>
      `;
      break;

    case 'accepted_alternative':
      subject = 'Potvrđen alternativni termin rezervacije';
      text =
        `Uspješno ste prihvatili alternativni termin za rezervaciju u restoranu "${reservation.restaurant.name}".\n\n` +
        `Novi detalji rezervacije:\n` +
        `Restoran: "${reservation.restaurant.name}"\n` +
        `Datum: ${formattedDate}\n` +
        `Vrijeme: ${formattedTime}\n` +
        `Broj gostiju: ${reservation.guests}`;

      htmlContent = `
        <div class="text-center">
          <h1>✅ Alternativni termin potvrđen</h1>
          <p>Uspješno ste prihvatili alternativni termin!</p>
        </div>
        
        <div class="card">
          <h3 style="margin-top: 0;">${reservation.restaurant.name}</h3>
          <div class="detail-row">
            <span class="detail-label">📅 Datum:</span>
            <span class="detail-value">${formattedDate}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">🕐 Vrijeme:</span>
            <span class="detail-value">${formattedTime}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">👥 Broj gostiju:</span>
            <span class="detail-value">${reservation.guests}</span>
          </div>
        </div>
        
        <div class="text-center">
          <p>Veselimo se vašem dolasku!</p>
          <p class="text-muted">Ako imate pitanja, kontaktirajte restoran direktno.</p>
        </div>
      `;
      break;

    case 'cancellation':
      subject = 'Rezervacija otkazana';
      text = `Vaša rezervacija u restoranu "${reservation.restaurant.name}" za ${formattedDate} u ${formattedTime} je otkazana.`;

      htmlContent = `
        <div class="text-center">
          <h1>🚫 Rezervacija otkazana</h1>
          <p>Vaša rezervacija je otkazana.</p>
        </div>
        
        <div class="card">
          <h3 style="margin-top: 0;">${reservation.restaurant.name}</h3>
          <div class="detail-row">
            <span class="detail-label">📅 Datum:</span>
            <span class="detail-value">${formattedDate}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">🕐 Vrijeme:</span>
            <span class="detail-value">${formattedTime}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">👥 Broj gostiju:</span>
            <span class="detail-value">${reservation.guests}</span>
          </div>
        </div>
        
        <div class="text-center">
          <p>Uvijek možete napraviti novu rezervaciju putem Dinver platforme.</p>
          <p class="text-muted">Hvala vam na razumijevanju.</p>
        </div>
      `;
      break;

    case 'cancellation_by_restaurant':
      subject = 'Rezervacija otkazana od strane restorana';
      text =
        `Vaša rezervacija u restoranu "${reservation.restaurant.name}" za ${formattedDate} u ${formattedTime} je otkazana od strane restorana.\n` +
        (reservation.cancellationReason
          ? `\nRazlog: ${reservation.cancellationReason}`
          : '');

      htmlContent = `
        <div class="text-center">
          <h1>🚫 Rezervacija otkazana</h1>
          <p>Restoran je otkazao vašu rezervaciju.</p>
        </div>
        
        <div class="card">
          <h3 style="margin-top: 0;">${reservation.restaurant.name}</h3>
          <div class="detail-row">
            <span class="detail-label">📅 Datum:</span>
            <span class="detail-value">${formattedDate}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">🕐 Vrijeme:</span>
            <span class="detail-value">${formattedTime}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">👥 Broj gostiju:</span>
            <span class="detail-value">${reservation.guests}</span>
          </div>
          ${
            reservation.cancellationReason
              ? `
          <div class="detail-row">
            <span class="detail-label">💬 Razlog:</span>
            <span class="detail-value">${reservation.cancellationReason}</span>
          </div>
          `
              : ''
          }
        </div>
        
        <div class="text-center">
          <p>Pozivamo vas da pokušate rezervirati drugi termin ili drugi restoran putem Dinver platforme.</p>
          <p class="text-muted">Hvala vam na razumijevanju.</p>
        </div>
      `;
      break;

    case 'visit_completed':
      subject = 'Hvala na posjetu!';
      text =
        `Hvala što ste posjetili restoran "${reservation.restaurant.name}"!\n\n` +
        `Nadamo se da ste uživali u svom boravku. Podijelite svoje iskustvo s drugima - napišite recenziju kroz Dinver aplikaciju.\n\n` +
        `Detalji posjete:\n` +
        `Restoran: "${reservation.restaurant.name}"\n` +
        `Datum: ${formattedDate}\n` +
        `Vrijeme: ${formattedTime}\n` +
        `Broj gostiju: ${reservation.guests}\n\n` +
        `Imate 14 dana za napisati recenziju. Vaše mišljenje je važno i pomaže drugim korisnicima u odabiru restorana.`;

      htmlContent = `
        <div class="text-center">
          <h1>🍽️ Hvala na posjetu!</h1>
          <p>Nadamo se da ste uživali u svom boravku.</p>
        </div>
        
        <div class="card">
          <h3 style="margin-top: 0;">${reservation.restaurant.name}</h3>
          <div class="detail-row">
            <span class="detail-label">📅 Datum:</span>
            <span class="detail-value">${formattedDate}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">🕐 Vrijeme:</span>
            <span class="detail-value">${formattedTime}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">👥 Broj gostiju:</span>
            <span class="detail-value">${reservation.guests}</span>
          </div>
        </div>
        
        <div class="text-center">
          <p>Podijelite svoje iskustvo s drugima - napišite recenziju kroz Dinver aplikaciju.</p>
          <p class="text-muted">Imate 14 dana za napisati recenziju. Vaše mišljenje je važno i pomaže drugim korisnicima u odabiru restorana.</p>
        </div>
      `;
      break;

    case 'new_reservation_admin':
      subject = 'Nova rezervacija u vašem restoranu';
      text =
        `Korisnik ${reservation.user.name} (${reservation.user.email}) je napravio novu rezervaciju u vašem restoranu "${reservation.restaurant.name}" za ${formattedDate} u ${formattedTime}.
` +
        `Broj gostiju: ${reservation.guests}
` +
        (reservation.noteFromUser && reservation.noteFromUser.trim() !== ''
          ? `Napomena korisnika: ${reservation.noteFromUser}\n`
          : '');
      htmlContent = `
        <div class="text-center">
          <h1>📋 Nova rezervacija</h1>
          <p>Imate novu rezervaciju u vašem restoranu.</p>
        </div>

        <div class="card">
          <h3 style="margin-top: 0;">Detalji rezervacije</h3>
          <div class="detail-row">
            <span class="detail-label">👤 Korisnik:</span>
            <span class="detail-value">${reservation.user.name}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">📧 Email:</span>
            <span class="detail-value"><a href="mailto:${reservation.user.email}">${reservation.user.email}</a></span>
          </div>
          <div class="detail-row">
            <span class="detail-label">📅 Datum:</span>
            <span class="detail-value">${formattedDate}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">🕐 Vrijeme:</span>
            <span class="detail-value">${formattedTime}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">👥 Broj gostiju:</span>
            <span class="detail-value">${reservation.guests}</span>
          </div>
          ${
            reservation.noteFromUser && reservation.noteFromUser.trim() !== ''
              ? `
          <div class="detail-row">
            <span class="detail-label">💬 Napomena:</span>
            <span class="detail-value">${reservation.noteFromUser}</span>
          </div>
          `
              : ''
          }
        </div>

        <div class="text-center">
          <p>Prijavite se u Dinver admin panel za upravljanje rezervacijama.</p>
          <p class="text-muted">Molimo odgovorite na rezervaciju što prije.</p>
        </div>
      `;
      break;

    case 'alternative_accepted_admin':
      subject = 'Korisnik je prihvatio alternativni termin';
      text =
        `Korisnik ${reservation.user.name} (${reservation.user.email}) je prihvatio alternativni termin za rezervaciju u vašem restoranu "${reservation.restaurant.name}".\n\n` +
        `Potvrđeni detalji rezervacije:\n` +
        `Restoran: "${reservation.restaurant.name}"\n` +
        `Datum: ${formattedDate}\n` +
        `Vrijeme: ${formattedTime}\n` +
        `Broj gostiju: ${reservation.guests}`;

      htmlContent = `
        <div class="text-center">
          <h1>✅ Alternativni termin prihvaćen</h1>
          <p>Korisnik je prihvatio vaš predloženi alternativni termin.</p>
        </div>

        <div class="card">
          <h3 style="margin-top: 0;">Potvrđeni detalji rezervacije</h3>
          <div class="detail-row">
            <span class="detail-label">👤 Korisnik:</span>
            <span class="detail-value">${reservation.user.name}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">📧 Email:</span>
            <span class="detail-value"><a href="mailto:${reservation.user.email}">${reservation.user.email}</a></span>
          </div>
          <div class="detail-row">
            <span class="detail-label">📅 Datum:</span>
            <span class="detail-value">${formattedDate}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">🕐 Vrijeme:</span>
            <span class="detail-value">${formattedTime}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">👥 Broj gostiju:</span>
            <span class="detail-value">${reservation.guests}</span>
          </div>
        </div>

        <div class="text-center">
          <p>Rezervacija je sada potvrđena. Gost će doći u navedenom terminu.</p>
          <p class="text-muted">Prijavite se u Dinver admin panel za pregled rezervacija.</p>
        </div>
      `;
      break;

    default:
      throw new Error('Invalid email type');
  }

  let data = {
    from: 'Dinver <noreply@dinver.eu>',
    to,
    subject,
    text,
    html: createEmailTemplate(htmlContent),
  };

  // Strengthen text part if necessary
  if (!data.text || data.text.length < 40) {
    data.text = htmlToPlainText(htmlContent || text);
  }

  // Add headers and Mailgun options
  data = addAntiSpamHeaders(data, {
    refId: `reservation-${type}-${Date.now()}`,
  });

  try {
    await sendEmail({
      from: data.from,
      to: data.to,
      subject: data.subject,
      text: data.text,
      html: data.html,
      headers: {
        'Message-ID': data['h:Message-ID'],
        'Reply-To': data['h:Reply-To'],
        'List-Unsubscribe': data['h:List-Unsubscribe'],
        'X-Entity-Ref-ID': data['h:X-Entity-Ref-ID'],
      },
      options: {
        dkim: data['o:dkim'],
        tracking: data['o:tracking'],
        'tracking-clicks': data['o:tracking-clicks'],
        'tracking-opens': data['o:tracking-opens'],
      },
    });
    console.log('Reservation email sent successfully');
  } catch (error) {
    console.error('Error sending reservation email:', error);
    throw error;
  }
};

const sendPasswordResetEmail = async (email, resetLink) => {
  const htmlContent = `
    <div class="text-center">
      <h1>Resetiranje lozinke</h1>
      <p>Primili smo zahtjev za resetiranje lozinke za vaš Dinver račun.</p>
      
      <div style="margin: 32px 0;">
        <a href="${resetLink}" class="button button-large">Resetiraj lozinku</a>
      </div>
      
      <p class="text-muted">Ovaj link će isteći za 1 sat.</p>
      
      <div class="card" style="margin-top: 32px;">
        <p class="text-muted mb-0">Ako gumb ne radi, kopirajte i zalijepite ovaj link u svoj preglednik:</p>
        <div class="link-container">
          ${resetLink}
        </div>
      </div>
      
      <div class="card" style="margin-top: 24px; background-color: #fef3cd; border-color: #fbbf24;">
        <p class="mb-0" style="color: #92400e; font-weight: 600;">⚠️ Sigurnosni savjet</p>
        <p class="mb-0" style="color: #92400e;">Ako niste zatražili resetiranje lozinke, molimo ignorirajte ovaj e-mail. Vaša lozinka ostaje nepromijenjena.</p>
      </div>
    </div>
  `;

  let data = {
    from: 'Dinver <noreply@dinver.eu>',
    to: email,
    subject: 'Resetiranje lozinke',
    text: `Zatražili ste resetiranje lozinke. Kliknite na sljedeći link za resetiranje lozinke: ${resetLink}. Ovaj link će isteći za 1 sat. Ako niste zatražili resetiranje lozinke, molimo ignorirajte ovaj e-mail.`,
    html: createEmailTemplate(htmlContent),
  };

  // Strengthen text part if necessary
  if (!data.text || data.text.length < 40) {
    data.text = htmlToPlainText(htmlContent);
  }

  // Add headers and Mailgun options
  data = addAntiSpamHeaders(data, { refId: `pwd-reset-${Date.now()}` });

  try {
    await sendEmail({
      from: data.from,
      to: data.to,
      subject: data.subject,
      text: data.text,
      html: data.html,
      headers: {
        'Message-ID': data['h:Message-ID'],
        'Reply-To': data['h:Reply-To'],
        'List-Unsubscribe': data['h:List-Unsubscribe'],
        'X-Entity-Ref-ID': data['h:X-Entity-Ref-ID'],
      },
      options: {
        dkim: data['o:dkim'],
        tracking: data['o:tracking'],
        'tracking-clicks': data['o:tracking-clicks'],
        'tracking-opens': data['o:tracking-opens'],
      },
    });
    console.log('Password reset email sent successfully');
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};

module.exports = {
  sendVerificationEmail,
  sendReservationEmail,
  sendPasswordResetEmail,
  createEmailTemplate,
};
