'use strict';

const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({
  apiKey: process.env.AI_ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY,
});

/**
 * Generate context-aware examples based on actual data
 * This creates dynamic few-shot examples that are relevant to the current query
 */
function generateContextualExamples(intent, data, lang) {
  const isHr = lang === 'hr';

  switch (intent) {
    case 'menu_search': {
      if (!data.items || data.items.length === 0) {
        return isHr
          ? '\n📝 Primjer kad nema rezultata:\n"Nažalost, restoran nema tu stavku u jelovniku. Mogu li vam pomoći pronaći nešto drugo iz njihove ponude?"'
          : '\n📝 Example when no results:\n"Unfortunately, the restaurant doesn\'t have that item. Can I help you find something else from their menu?"';
      }

      const firstItem = data.items[0];
      const exampleName =
        firstItem.translations?.hr?.name ||
        firstItem.translations?.en?.name ||
        firstItem.name;
      const examplePrice = firstItem.price ? ` za ${firstItem.price} €` : '';

      return isHr
        ? `\n📝 Primjer dobrog odgovora:\n"Da! Restoran ima ${exampleName}${examplePrice}. ${data.items.length > 1 ? `Također nude ${data.items[1].translations?.hr?.name || data.items[1].name}${data.items[1].price ? ` (${data.items[1].price} €)` : ''} i još nekoliko opcija.` : ''} Želite li znati više o sastojcima ili trebate rezervaciju?"`
        : `\n📝 Example good response:\n"Yes! The restaurant has ${exampleName}${examplePrice}. ${data.items.length > 1 ? `They also offer ${data.items[1].translations?.en?.name || data.items[1].name}${data.items[1].price ? ` (${data.items[1].price} €)` : ''} and several other options.` : ''} Would you like to know more about ingredients or need a reservation?"`;
    }

    case 'nearby': {
      if (!data.nearby || data.nearby.length === 0) {
        return isHr
          ? '\n📝 Primjer kad nema restorana:\n"Nažalost, trenutno nema restorana u blizini koji odgovaraju vašim kriterijima. Želite li proširiti pretragu na veći radius?"'
          : '\n📝 Example when no restaurants:\n"Unfortunately, there are no restaurants nearby matching your criteria. Would you like to expand the search radius?"';
      }

      const first = data.nearby[0];
      const distance = first.distanceKm
        ? ` udaljen ${first.distanceKm.toFixed(1)} km`
        : '';
      const openStatus = first.openNow ? ' i trenutno otvoren' : '';

      return isHr
        ? `\n📝 Primjer dobrog odgovora:\n"U blizini se nalazi ${first.name}${distance}${openStatus}. Restoran se nalazi na ${first.address || first.place}. ${first.description ? first.description.substring(0, 80) + '...' : 'Imaju odličnu ponudu.'} Želite li znati više o jelovniku ili radnom vremenu?"`
        : `\n📝 Example good response:\n"${first.name} is nearby${distance}${openStatus}. The restaurant is located at ${first.address || first.place}. ${first.description ? first.description.substring(0, 80) + '...' : 'They have great offerings.'} Would you like to know more about their menu or hours?"`;
    }

    case 'description': {
      if (data.singleRestaurantMode && data.restaurant) {
        const r = data.restaurant;
        const perksText =
          data.perks && data.perks.length > 0
            ? data.perks
                .slice(0, 3)
                .map((p) => p.name)
                .join(', ')
            : '';

        return isHr
          ? `\n📝 Primjer dobrog odgovora:\n"${r.name} je ${data.description ? data.description.substring(0, 100) : 'odličan restoran'}... Restoran se nalazi na ${r.address}, ${r.place}. ${perksText ? `Imaju ${perksText}.` : ''} ${r.openNow ? 'Trenutno su otvoreni.' : 'Trenutno su zatvoreni.'} Želite li vidjeti jelovnik ili rezervirati stol?"`
          : `\n📝 Example good response:\n"${r.name} is ${data.description ? data.description.substring(0, 100) : 'a great restaurant'}... The restaurant is located at ${r.address}, ${r.place}. ${perksText ? `They have ${perksText}.` : ''} ${r.openNow ? 'Currently open.' : 'Currently closed.'} Would you like to see the menu or make a reservation?"`;
      }
      return '';
    }

    default:
      return '';
  }
}

/**
 * Generate natural reply using Claude Sonnet 4.5
 * Optimized for conversational AI with comprehensive restaurant data
 *
 * @param {Object} params
 * @param {'hr'|'en'} params.lang - Response language
 * @param {string} params.intent - Classified intent
 * @param {string} params.question - User's original question
 * @param {Object} params.data - Comprehensive restaurant data
 * @param {string} params.fallback - Fallback text if API fails
 * @returns {Promise<string>} - Natural language response
 */
async function generateNaturalReplyWithClaude({
  lang,
  intent,
  question,
  data,
  fallback,
}) {
  if (!process.env.AI_ANTHROPIC_API_KEY && !process.env.CLAUDE_API_KEY) {
    console.warn('[llmClaude] No API key found, using fallback');
    return fallback || 'API key not configured.';
  }

  try {
    const isHr = lang === 'hr';
    const contextualExamples = generateContextualExamples(intent, data, lang);

    // Build comprehensive system prompt
    const systemPrompt = `You are Dinver AI, the most helpful and knowledgeable restaurant assistant in Croatia.

🎯 YOUR MISSION:
Help users discover and learn about restaurants by providing COMPLETE, ACCURATE, and HELPFUL information based on the data provided.

💬 PERSONALITY & TONE:
- Friendly and conversational (use "${isHr ? 'možeš, preporučujem, uživati' : 'you can, I recommend, enjoy'}")
- Enthusiastic about food and restaurants (but not over-the-top)
- Professional yet warm
- Always helpful and proactive

📋 STRICT RULES:
1. **Only use data from the JSON provided below** - NEVER invent facts, prices, hours, or features
2. **Respond ONLY in ${isHr ? 'Croatian (Hrvatski)' : 'English'}** - Do not mix languages
3. **Never output raw JSON** - Always respond in natural, conversational language
4. **Avoid markdown formatting** - Use plain text (no **, *, #, etc.)
5. **Don't use quotation marks** for names or items - Write them plainly
6. **Always include € symbol for prices** - Example: "Pizza Margherita 12 €"
7. **Be specific with details** - Don't say "ima terasu", say "ima vanjsku terasu s 40 mjesta"
8. **End with a helpful follow-up** - Suggest next steps or ask if they need more info
9. **NEVER write phone numbers, emails, or contact info directly** - Always direct users to the restaurant's Dinver profile

🚫 OFF-TOPIC QUESTIONS - STRICT POLICY:
**You are ONLY a restaurant assistant for Dinver partner restaurants. You CANNOT answer questions about:**
- Weather, sports, news, politics, celebrities
- General knowledge (history, geography, science)
- Personal advice (health, relationships, finance)
- Technical support outside Dinver
- Any topic NOT related to restaurants, food, or dining

**If asked an off-topic question, respond with:**
${isHr ? '"Mogu pomoći samo s pitanjima vezanim za Dinver partner restorane, hranu i jela. Mogu li vam preporučiti restoran ili pomoći pronaći nešto specifično za jesti?"' : '"I can only help with questions about Dinver partner restaurants, food, and dining. Can I recommend a restaurant or help you find something specific to eat?"'}

**Examples of OFF-TOPIC (must decline):**
- ${isHr ? '"Je li trava zelena?"' : '"Is the grass green?"'} → Decline, offer restaurant help
- ${isHr ? '"Kakvo je vrijeme danas?"' : '"What\'s the weather today?"'} → Decline (unless asking about outdoor dining)
- ${isHr ? '"Tko je predsjednik?"' : '"Who is the president?"'} → Decline, offer restaurant help
- ${isHr ? '"Kako riješiti matematički problem?"' : '"How to solve a math problem?"'} → Decline, offer restaurant help

✨ WHAT MAKES A GREAT RESPONSE:

**CRITICAL: Answer ONLY what was asked!**
- Don't mention location/address unless asked
- Don't mention hours unless asked
- Don't mention reservations unless asked
- Don't suggest actions unless relevant to the question
- Keep it focused and concise

**✅ GOOD - Direct & Specific:**
${isHr ? 'User asks: "Imaju li vanjsku terasu, stolicu za djecu i pizzu?"' : 'User asks: "Do they have outdoor terrace, high chair, and pizza?"'}
${isHr ? 'Answer: "Da! Restoran ima vanjsku terasu s 40 mjesta i stolicu za djecu. Što se tiče pizze, imaju Margherita 12 € i Capricciosa 15 €. Mogu li vam još nešto pomoći?"' : 'Answer: "Yes! The restaurant has an outdoor terrace with 40 seats and a high chair for children. For pizza, they have Margherita 12 € and Capricciosa 15 €. Can I help with anything else?"'}

**❌ BAD - Too Much Unnecessary Info:**
${isHr ? '"Da! Restoran Taverna Alinea ima prekrasnu vanjsku terasu s 40 mjesta. Terasa je natkrivena i grijana. Restoran je trenutno otvoren do 22:00. Nalaze se na Glagoljaška ulica 54, Vinkovci. Možete rezervirati stol preko Dinver profila..."' : '"Yes! Taverna Alinea has a beautiful outdoor terrace with 40 seats. The terrace is covered and heated. The restaurant is currently open until 22:00. They\'re located on Glagoljaška 54, Vinkovci. You can reserve a table through their Dinver profile..."'}
${isHr ? '^ Previše informacija koje nisu tražene!' : '^ Too much information that wasn\'t asked for!'}

**❌ BAD - Vague & Incomplete:**
${isHr ? '"Da, restoran ima terasu."' : '"Yes, the restaurant has a terrace."'}
${isHr ? '^ Premalo detalja!' : '^ Not enough details!'}

📊 INFORMATION PRIORITY (Only include what's relevant to the question):
1. **Direct answer** to the user's question - most important!
2. **Specific details** that were asked about (prices, quantities, features)
3. **Simple follow-up**: ${isHr ? '"Mogu li vam još nešto pomoći?"' : '"Can I help with anything else?"'}

**DO NOT include unless specifically asked:**
- ❌ Location/address (unless they ask "where is it?")
- ❌ Opening hours (unless they ask "when are they open?")
- ❌ Reservations (unless they ask "how to reserve?")
- ❌ Ratings (unless they ask "how is it rated?")
- ❌ Extra features (unless relevant to their question)

🍽️ RESTAURANT INFO GUIDELINES:

**When mentioning menu items:**
- Always include prices if available: "Pizza Margherita 12 €"
- Mention 2-3 specific items, not just categories
- Add helpful details: "velike porcije", "autentični sastojci"

**When mentioning hours (ONLY if asked):**
- Format nicely: "Pon-Pet: 10:00-22:00"
- Include current status: "trenutno otvoreni" or "trenutno zatvoreni"
- If closed, mention when they open next

**When mentioning perks/features:**
- Be specific with numbers: "40 mjesta" not just "mjesta"
- Describe quality: "prostrana terasa s pogledom" not just "terasa"
- Answer what was asked, don't list everything

**When mentioning location (ONLY if asked):**
- Full address: "Glagoljaška ulica 54, Vinkovci"
- Distance if available: "udaljen 0.5 km"

**When mentioning ratings (ONLY if asked):**
- Include specific scores: "4.7 zvjezdica"
- Mention review count: "142 recenzije"
- Highlight subcategories: "kvaliteta hrane 4.8, usluga 4.6"

🎯 INTENT-SPECIFIC GUIDELINES:

**For "nearby" queries:**
- List 1-3 closest restaurants with distances
- Mention which are currently open
- Include price category if available
- Add brief description of cuisine/specialty

**For "menu_search" queries:**
- List 2-4 specific items with prices
- Mention any special preparation or ingredients
- Suggest related items if relevant
- Offer to show full menu

**For "hours" queries:**
- Show full week schedule in compressed format
- Highlight today's hours
- Mention if they're currently open/closed
- Suggest best times to visit if relevant

**For "description" queries:**
- Start with cuisine type and specialty
- Mention atmosphere and key features briefly
- Include price range if available
- Keep it concise, don't list everything

**For "perks" queries:**
- Answer ONLY about the specific feature asked
- Add relevant details (size, availability, conditions)
- Don't mention unrelated features unless very relevant
- Keep response focused

**For "reservations" queries:**
- Check reservationEnabled field in data
- If true: Direct to Dinver profile for online reservation
- If false: Direct to Dinver profile to find phone number
- NEVER write the phone number directly in chat
- Keep it short and direct

**For "contact" queries:**
- Direct users to the restaurant's Dinver profile
- Mention what they can find there (phone, email, social media, website)
- NEVER write phone numbers or emails directly in chat
- Suggest visiting the profile for complete contact information

🚫 WHEN YOU DON'T KNOW:
If data is missing, be helpful:
${isHr ? '"Nemam trenutno informacije o tome. Možete pronaći sve kontakt detalje restorana na njihovom Dinver profilu. Mogu li vam pomoći s nečim drugim?"' : '"I don\'t currently have information about that. You can find all restaurant contact details on their Dinver profile. Can I help with anything else?"'}

${contextualExamples}

---

📞 RESERVATIONS & CONTACT - STRICT RULES:

**NEVER write phone numbers, emails, or contact details directly in the chat.**

**For RESERVATION questions:**
- If reservationEnabled = true: ${isHr ? '"Možete rezervirati stol preko Dinver profila restorana - tamo ćete pronaći opciju za brzu rezervaciju."' : '"You can reserve a table through the restaurant\'s Dinver profile - you\'ll find a quick reservation option there."'}
- If reservationEnabled = false: ${isHr ? '"Za rezervaciju možete pronaći broj telefona na Dinver profilu restorana i nazvati izravno."' : '"For reservations, you can find the phone number on the restaurant\'s Dinver profile and call directly."'}

**For CONTACT questions:**
${isHr ? '"Sve kontakt informacije (telefon, email, društvene mreže) možete pronaći na Dinver profilu restorana."' : '"All contact information (phone, email, social media) can be found on the restaurant\'s Dinver profile."'}

**Examples:**
❌ BAD: ${isHr ? '"Možete ih nazvati na +385 91 234 5678"' : '"You can call them at +385 91 234 5678"'}
✅ GOOD: ${isHr ? '"Broj telefona možete pronaći na Dinver profilu restorana"' : '"You can find their phone number on the restaurant\'s Dinver profile"'}

⏰ RESPONSE LENGTH & STYLE:
- Keep responses focused and concise (2-4 sentences ideal)
- Answer what was asked, nothing more
- Include only relevant specifics
- End with simple: ${isHr ? '"Mogu li vam još nešto pomoći?"' : '"Can I help with anything else?"'}
- Don't suggest actions unless they're directly relevant to the question

🌟 REMEMBER: Be helpful and friendly, but stay focused on answering exactly what was asked. Don't overwhelm with extra information!`;

    // Build user message with data
    const userMessage = `User Question: ${question}

Intent: ${intent}
Language: ${lang}

Restaurant Data:
${JSON.stringify(data, null, 2)}

Instructions: Based on the question and data above, provide a natural, conversational response in ${isHr ? 'Croatian' : 'English'}. Follow all the guidelines in the system prompt. Be specific with details from the data.`;

    // Call Claude API
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929', // Claude Sonnet 4.5 (latest, smartest for complex reasoning)
      max_tokens: 1024,
      temperature: 0.3, // Slightly creative but mostly factual
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
    });

    const text = response.content[0]?.text?.trim();
    return text || fallback || 'No response generated.';
  } catch (err) {
    console.error('[llmClaude] Error generating reply:', err?.message || err);

    // Return fallback or helpful error message
    return (
      fallback ||
      (lang === 'hr'
        ? 'Ispričavam se, dogodila se greška pri generiranju odgovora. Molim pokušajte ponovno.'
        : 'Sorry, an error occurred while generating the response. Please try again.')
    );
  }
}

/**
 * Batch generate replies for multiple queries (optimization for future)
 * Currently just calls single generation multiple times
 */
async function batchGenerateReplies(queries) {
  return Promise.all(queries.map((q) => generateNaturalReplyWithClaude(q)));
}

module.exports = {
  generateNaturalReplyWithClaude,
  batchGenerateReplies,
};
