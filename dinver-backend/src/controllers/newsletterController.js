const { NewsletterSubscriber } = require('../../models');
const mailgun = require('mailgun-js');
const { format } = require('date-fns');
const { hr } = require('date-fns/locale');

const mg = mailgun({
  apiKey: process.env.MAILGUN_API_KEY,
  domain: process.env.MAILGUN_DOMAIN,
});

const LOGO_URL =
  'https://dinver-restaurant-thumbnails.s3.eu-north-1.amazonaws.com/static_images/logo_long.png';

const BASE_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://dinverapp.com'
    : 'http://localhost:3000';

const API_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://api.dinver.eu'
    : 'http://localhost:8000';

const sendNewsletterEmail = async (to, template) => {
  const templates = {
    welcome: {
      subject: 'Dobrodošli u Dinver Newsletter!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0;">
          <div style="background-color: #1C3329; width: 100%; padding: 40px 0; text-align: center; margin-bottom: 30px;">
            <img src="${LOGO_URL}" alt="Dinver Logo" style="width: 200px;">
          </div>
          
          <div style="padding: 0 20px;">
            <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 20px; text-align: center;">
              Dobrodošli u Dinver Newsletter!
            </h1>
            
            <p style="color: #444444; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Drago nam je što ste se pretplatili na Dinver newsletter! Od sada ćete među prvima saznati o:
            </p>
            
            <ul style="color: #444444; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
              <li>Novim restoranima u našoj mreži</li>
              <li>Ekskluzivnim gastro događanjima</li>
              <li>Kulinarskim trendovima</li>
              <li>Posebnim ponudama i pogodnostima</li>
            </ul>
            
            <p style="color: #444444; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
              Radujemo se što ćemo s vama dijeliti najbolje iz svijeta gastronomije!
            </p>
            
            <div style="text-align: center; margin-bottom: 30px;">
              <a href="https://dinverapp.com/blog" 
                 style="background-color: #10B981; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Posjetite Naš Blog
              </a>
            </div>
            
            <p style="color: #666666; font-size: 14px; text-align: center; margin-top: 40px;">
              © ${new Date().getFullYear()} Dinver. Sva prava pridržana.<br>
              <a href="${BASE_URL}/odjava-newsletter/${Buffer.from(to).toString('base64')}" 
                 style="color: #666666; text-decoration: underline;">
                Odjava s newslettera
              </a>
            </p>
          </div>
        </div>
      `,
    },
    resubscribe: {
      subject: 'Dobrodošli natrag u Dinver Newsletter!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0;">
          <div style="background-color: #1C3329; width: 100%; padding: 40px 0; text-align: center; margin-bottom: 30px;">
            <img src="${LOGO_URL}" alt="Dinver Logo" style="width: 200px;">
          </div>
          
          <div style="padding: 0 20px;">
            <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 20px; text-align: center;">
              Dobrodošli natrag!
            </h1>
            
            <p style="color: #444444; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Drago nam je što ste ponovno s nama! Nastavit ćemo vas informirati o najboljim gastro doživljajima i novostima.
            </p>
            
            <p style="color: #444444; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
              U međuvremenu smo dodali mnogo novih restorana i sadržaja koje možete istražiti.
            </p>
            
            <div style="text-align: center; margin-bottom: 30px;">
              <a href="https://dinverapp.com/restaurants" 
                 style="background-color: #10B981; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Istražite Restorane
              </a>
            </div>
            
            <p style="color: #666666; font-size: 14px; text-align: center; margin-top: 40px;">
              © ${new Date().getFullYear()} Dinver. Sva prava pridržana.<br>
              <a href="${BASE_URL}/odjava-newsletter/${Buffer.from(to).toString('base64')}" 
                 style="color: #666666; text-decoration: underline;">
                Odjava s newslettera
              </a>
            </p>
          </div>
        </div>
      `,
    },
    unsubscribe: {
      subject: 'Potvrda odjave s Dinver Newslettera',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0;">
          <div style="background-color: #1C3329; width: 100%; padding: 40px 0; text-align: center; margin-bottom: 30px;">
            <img src="${LOGO_URL}" alt="Dinver Logo" style="width: 200px;">
          </div>
          
          <div style="padding: 0 20px;">
            <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 20px; text-align: center;">
              Žao nam je što odlazite
            </h1>
            
            <p style="color: #444444; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Potvđujemo da ste uspješno odjavljeni s Dinver newslettera. Nećete više primati naše obavijesti.
            </p>
            
            <p style="color: #444444; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
              Ako ste se predomislili ili ste se odjavili greškom, uvijek se možete ponovno pretplatiti.
            </p>
            
            <div style="text-align: center; margin-bottom: 30px;">
              <a href="https://dinverapp.com/newsletter/subscribe" 
                 style="background-color: #10B981; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Pretplatite se Ponovno
              </a>
            </div>
            
            <p style="color: #666666; font-size: 14px; text-align: center; margin-top: 40px;">
              © ${new Date().getFullYear()} Dinver. Sva prava pridržana.
            </p>
          </div>
        </div>
      `,
    },
  };

  const emailData = {
    from: 'Dinver <newsletter@dinverapp.com>',
    to: to,
    subject: templates[template].subject,
    html: templates[template].html,
  };

  try {
    await mg.messages().send(emailData);
    console.log(`Newsletter ${template} email sent successfully to ${to}`);
  } catch (error) {
    console.error('Error sending newsletter email:', error);
    throw error;
  }
};

// Subscribe to newsletter
const subscribe = async (req, res) => {
  try {
    const { email, source = 'landing_page' } = req.body;

    // Check if already subscribed
    const existingSubscriber = await NewsletterSubscriber.findOne({
      where: { email },
    });

    if (existingSubscriber) {
      if (existingSubscriber.status === 'active') {
        return res.status(400).json({
          error: 'Već ste pretplaćeni na newsletter',
        });
      } else {
        // Reactivate subscription
        await existingSubscriber.update({
          status: 'active',
          unsubscribedAt: null,
          subscribedAt: new Date(),
        });

        // Send welcome back email
        await sendNewsletterEmail(email, 'resubscribe');

        return res.json({
          message: 'Pretplata je uspješno obnovljena',
        });
      }
    }

    // Create new subscription
    const subscriber = await NewsletterSubscriber.create({
      email,
      source,
    });

    // Send welcome email
    await sendNewsletterEmail(email, 'welcome');

    res.status(201).json({
      message: 'Uspješno ste se pretplatili na newsletter',
    });
  } catch (error) {
    console.error('Newsletter subscription error:', error);
    res.status(500).json({
      error: 'Došlo je do greške prilikom pretplate',
    });
  }
};

// Unsubscribe from newsletter with token verification
const unsubscribe = async (req, res) => {
  try {
    const { token } = req.params;

    // Decode email from base64 token
    let email;
    try {
      email = Buffer.from(token, 'base64').toString('utf-8');
    } catch (error) {
      return res.send(`
        <html>
          <head>
            <title>Odjava Neuspješna</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, sans-serif; 
                display: flex; 
                justify-content: center; 
                align-items: center; 
                height: 100vh; 
                margin: 0; 
                background-color: #f5f5f5; 
              }
              .container { 
                text-align: center; 
                padding: 2rem; 
                background: white; 
                border-radius: 12px; 
                box-shadow: 0 2px 4px rgba(0,0,0,0.1); 
                margin: 1rem;
                max-width: 500px;
                width: 100%;
              }
              .logo {
                max-width: 200px;
                margin-bottom: 2rem;
              }
              .error { 
                color: #dc2626; 
                font-size: 1.5rem; 
                margin-bottom: 1rem; 
              }
              p { 
                color: #4b5563; 
                font-size: 1.1rem; 
                line-height: 1.5; 
              }
            </style>
          </head>
          <body>
            <div class="container">
              <img src="${LOGO_URL}" alt="Dinver Logo" class="logo">
              <h1 class="error">Odjava Neuspješna</h1>
              <p>Neispravan link za odjavu.</p>
              <p>Molimo vas da pokušate ponovno ili nas kontaktirajte ako problem i dalje postoji.</p>
            </div>
          </body>
        </html>
      `);
    }

    const subscriber = await NewsletterSubscriber.findOne({
      where: { email },
    });

    if (!subscriber) {
      return res.send(`
        <html>
          <head>
            <title>Odjava Neuspješna</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, sans-serif; 
                display: flex; 
                justify-content: center; 
                align-items: center; 
                height: 100vh; 
                margin: 0; 
                background-color: #f5f5f5; 
              }
              .container { 
                text-align: center; 
                padding: 2rem; 
                background: white; 
                border-radius: 12px; 
                box-shadow: 0 2px 4px rgba(0,0,0,0.1); 
                margin: 1rem;
                max-width: 500px;
                width: 100%;
              }
              .logo {
                max-width: 200px;
                margin-bottom: 2rem;
              }
              .error { 
                color: #dc2626; 
                font-size: 1.5rem; 
                margin-bottom: 1rem; 
              }
              p { 
                color: #4b5563; 
                font-size: 1.1rem; 
                line-height: 1.5; 
              }
            </style>
          </head>
          <body>
            <div class="container">
              <img src="${LOGO_URL}" alt="Dinver Logo" class="logo">
              <h1 class="error">Pretplata Nije Pronađena</h1>
              <p>Nismo pronašli aktivnu pretplatu za ovu email adresu.</p>
              <p>Moguće je da ste se već odjavili ili da je došlo do greške.</p>
            </div>
          </body>
        </html>
      `);
    }

    await subscriber.update({
      status: 'unsubscribed',
      unsubscribedAt: new Date(),
    });

    // Send unsubscribe confirmation email
    await sendNewsletterEmail(email, 'unsubscribe');

    res.send(`
      <html>
        <head>
          <title>Uspješna Odjava</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, sans-serif; 
              display: flex; 
              justify-content: center; 
              align-items: center; 
              height: 100vh; 
              margin: 0; 
              background-color: #f5f5f5; 
            }
            .container { 
              text-align: center; 
              padding: 2rem; 
              background: white; 
              border-radius: 12px; 
              box-shadow: 0 2px 4px rgba(0,0,0,0.1); 
              margin: 1rem;
              max-width: 500px;
              width: 100%;
            }
            .logo {
              max-width: 200px;
              margin-bottom: 2rem;
            }
            .success { 
              color: #059669; 
              font-size: 1.5rem; 
              margin-bottom: 1rem; 
            }
            .checkmark { 
              font-size: 4rem; 
              margin-bottom: 1rem; 
              color: #059669;
            }
            p { 
              color: #4b5563; 
              font-size: 1.1rem; 
              line-height: 1.5; 
            }
            .button {
              display: inline-block;
              background-color: #10B981;
              color: white;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 6px;
              margin-top: 1rem;
              font-weight: 500;
              transition: background-color 0.2s;
            }
            .button:hover {
              background-color: #059669;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <img src="${LOGO_URL}" alt="Dinver Logo" class="logo">
            <div class="checkmark">✓</div>
            <h1 class="success">Uspješno ste se odjavili</h1>
            <p>Više nećete primati naše newsletter obavijesti.</p>
            <p>Ako se predomislite, uvijek se možete ponovno pretplatiti.</p>
            <a href="https://dinverapp.com/newsletter/subscribe" class="button">
              Pretplatite se Ponovno
            </a>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Newsletter unsubscribe error:', error);
    res.send(`
      <html>
        <head>
          <title>Greška Prilikom Odjave</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, sans-serif; 
              display: flex; 
              justify-content: center; 
              align-items: center; 
              height: 100vh; 
              margin: 0; 
              background-color: #f5f5f5; 
            }
            .container { 
              text-align: center; 
              padding: 2rem; 
              background: white; 
              border-radius: 12px; 
              box-shadow: 0 2px 4px rgba(0,0,0,0.1); 
              margin: 1rem;
              max-width: 500px;
              width: 100%;
            }
            .logo {
              max-width: 200px;
              margin-bottom: 2rem;
            }
            .error { 
              color: #dc2626; 
              font-size: 1.5rem; 
              margin-bottom: 1rem; 
            }
            p { 
              color: #4b5563; 
              font-size: 1.1rem; 
              line-height: 1.5; 
            }
          </style>
        </head>
        <body>
          <div class="container">
            <img src="${LOGO_URL}" alt="Dinver Logo" class="logo">
            <h1 class="error">Greška Prilikom Odjave</h1>
            <p>Došlo je do greške prilikom obrade vašeg zahtjeva.</p>
            <p>Molimo vas da pokušate ponovno ili nas kontaktirajte ako problem i dalje postoji.</p>
          </div>
        </body>
      </html>
    `);
  }
};

// Get newsletter statistics (protected admin route)
const getStats = async (req, res) => {
  try {
    const totalSubscribers = await NewsletterSubscriber.count();
    const activeSubscribers = await NewsletterSubscriber.count({
      where: { status: 'active' },
    });
    const unsubscribed = await NewsletterSubscriber.count({
      where: { status: 'unsubscribed' },
    });

    // Get subscriptions by source
    const subscriptionsBySource = await NewsletterSubscriber.count({
      where: { status: 'active' },
      group: ['source'],
    });

    res.json({
      total: totalSubscribers,
      active: activeSubscribers,
      unsubscribed,
      bySource: subscriptionsBySource,
    });
  } catch (error) {
    console.error('Error fetching newsletter stats:', error);
    res.status(500).json({
      error: 'Došlo je do greške prilikom dohvaćanja statistike',
    });
  }
};

// Force unsubscribe (sysadmin only)
const forceUnsubscribe = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Email je obavezan',
      });
    }

    const subscriber = await NewsletterSubscriber.findOne({
      where: { email },
    });

    if (!subscriber) {
      return res.status(404).json({
        error: 'Pretplatnik nije pronađen',
      });
    }

    await subscriber.update({
      status: 'unsubscribed',
      unsubscribedAt: new Date(),
    });

    // Send unsubscribe confirmation email
    await sendNewsletterEmail(email, 'unsubscribe');

    res.json({
      message: 'Pretplatnik je uspješno odjavljen',
      email: email,
      unsubscribedAt: new Date(),
    });
  } catch (error) {
    console.error('Force unsubscribe error:', error);
    res.status(500).json({
      error: 'Došlo je do greške prilikom odjave pretplatnika',
    });
  }
};

module.exports = {
  subscribe,
  unsubscribe,
  getStats,
  forceUnsubscribe,
};
