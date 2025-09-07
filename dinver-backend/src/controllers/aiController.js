const { routeQuery } = require('../utils/aiService');
const { formatAnswer } = require('../utils/answerFormatter');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async query(req, res) {
    try {
      const {
        q,
        latitude,
        longitude,
        radiusKm,
        limit,
        cursor,
        threadId,
        debug,
      } = req.body || {};
      // Basic coordinate validation (if provided)
      if (
        (latitude != null && (latitude < -90 || latitude > 90)) ||
        (longitude != null && (longitude < -180 || longitude > 180))
      ) {
        return res.status(400).json({ error: 'Invalid coordinates.' });
      }
      if (!q || typeof q !== 'string' || q.trim().length === 0) {
        return res.status(400).json({ error: 'Missing query text.' });
      }

      const t0 = Date.now();
      // Clamp radius here (0.2 .. MAX via env or default 15)
      const MAX_R = Number(process.env.AI_MAX_RADIUS_KM || 10);
      const MIN_R = 0.2;
      const clampedRadius =
        typeof radiusKm === 'number'
          ? Math.min(Math.max(radiusKm, MIN_R), MAX_R)
          : radiusKm;

      const effectiveThreadId = threadId || uuidv4();

      const response = await routeQuery({
        query: q,
        latitude,
        longitude,
        radiusKm: clampedRadius,
        limit,
        cursor,
        threadId: effectiveThreadId,
      });
      const durationMs = Date.now() - t0;

      // Add minimal audit-like metadata for observability
      const meta = {
        intent: response.intent,
        params: response.params,
        userId: req.user?.id || null,
        ts: Date.now(),
        durationMs,
        model: response.model || null,
        usage: response.usage || null,
        llmError: response.llmError || null,
        threadId: effectiveThreadId,
      };
      // Attach service paramsHash early so it is available for logging
      meta.paramsHash = response.paramsHash || null;
      // Unified response: meta + answer + results
      const results = {
        restaurants: Array.isArray(response.restaurants)
          ? response.restaurants
          : [],
        items: Array.isArray(response.items) ? response.items : [],
      };
      const body = {
        meta,
        code: response.code || null,
        answer: response.answer || null,
        results,
        nextCursor: response.nextCursor ?? null,
        prevCursor: response.prevCursor ?? null,
        pageInfo: response.pageInfo || undefined,
      };
      // Logging moved after NLG so that NLG fields are available
      if (debug) {
        body.debug = { intent: response.intent, params: response.params };
        if (response.contextSummary)
          body.debug.contextSummary = response.contextSummary;
      }

      // Entities for UI chips
      body.entities = {
        item: response?.params?.itemName || null,
        perk: response?.params?.perkName || null,
        city: response?.params?.city || null,
        restaurantName:
          response?.params?.restaurantName || response?.params?.name || null,
        nearMe: latitude != null && longitude != null,
        radiusKm: response?.params?.radiusKm ?? clampedRadius ?? null,
        priceCategory: response?.params?.priceCategory || null,
        foodTypes: response?.params?.foodTypes || [],
        dietaryTypes: response?.params?.dietaryTypes || [],
        perks: response?.params?.perks || [],
        establishmentTypes: response?.params?.establishmentTypes || [],
      };

      // Surface params hash if provided (useful for cursor validation client-side)
      if (response.paramsHash) body.meta.paramsHash = response.paramsHash;

      // Human-friendly default answers when answer is null
      if (!body.answer) {
        if (body.code === 'NO_RESULTS') {
          const parts = [];
          if (body.entities.item) parts.push(body.entities.item);
          if (body.entities.perk) parts.push(body.entities.perk);
          const what = parts.length ? parts.join(' i ') : 'traženo';
          const scope = body.entities.city
            ? `u ${body.entities.city}`
            : body.entities.nearMe && body.entities.radiusKm
              ? `u krugu ${body.entities.radiusKm} km`
              : 'u blizini';
          body.answer = `Nismo pronašli ${what} ${scope} kod naših partnera. Želiš li povećati radijus pretrage ili ukloniti neki filter?`;
        } else if (body.code === 'MISSING_LOCATION') {
          body.answer = 'Trebam tvoju lokaciju za pretragu u blizini.';
        } else if (body.code === 'RESTAURANT_NOT_FOUND') {
          body.answer = 'Nismo pronašli taj restoran među Dinver partnerima.';
        } else if (body.code === 'NOT_PARTNER') {
          body.answer =
            'Taj restoran trenutno nije Dinver partner pa nemamo točne podatke.';
        } else if (body.code === 'AMBIGUOUS') {
          body.answer =
            'Možeš li malo pojasniti upit (npr. naziv restorana ili jelo)?';
        } else {
          // Generic positive fallback so UI always has a human-friendly answer
          const numRestaurants = Array.isArray(results.restaurants)
            ? results.restaurants.length
            : 0;
          const numItems = Array.isArray(results.items)
            ? results.items.length
            : 0;
          const scope = body.entities.city
            ? `u ${body.entities.city}`
            : body.entities.nearMe && body.entities.radiusKm
              ? `u krugu ${body.entities.radiusKm} km`
              : 'u blizini';
          if (numRestaurants > 0) {
            body.answer = `Pronašli smo ${numRestaurants} partnera ${scope}. Pogledaj preporuke ispod.`;
          } else if (numItems > 0) {
            body.answer = `Pronašli smo ${numItems} stavki ${scope}. Pogledaj preporuke ispod.`;
          } else {
            body.answer = 'Evo rezultata pretrage.';
          }
        }
      }

      // Try NLG formatter to polish the final message, except for deterministic open/close intent
      if (response.intent !== 'is_restaurant_open') {
        try {
          const nlgInput = {
            question: q,
            intent: response.intent,
            entities: body.entities,
            results,
            code: body.code,
            defaultAnswer: body.answer,
          };
          const nlg = await formatAnswer(nlgInput);
          if (nlg?.ok && nlg?.answer) {
            body.answer = nlg.answer;
            body.meta.nlgModel = nlg.model || null;
            body.meta.nlgLatencyMs = nlg.latencyMs || null;
          }
        } catch (_) {}
      }

      // Surface suggestedAction from service for UI quick actions (if present)
      if (response.suggestedAction)
        body.meta.suggestedAction = response.suggestedAction;

      // AI usage logging (after NLG)
      if (process.env.AI_USAGE_LOG === '1') {
        try {
          console.info('AI_USAGE_LOG', {
            model: meta.model,
            usage: meta.usage,
            durationMs: meta.durationMs,
            intent: meta.intent,
            llmError: meta.llmError,
            threadId: meta.threadId,
            argsCount: meta?.params ? Object.keys(meta.params).length : 0,
            resultsCount:
              (Array.isArray(results.restaurants)
                ? results.restaurants.length
                : 0) +
              (Array.isArray(results.items) ? results.items.length : 0),
            paramsHash: meta.paramsHash,
            nlgModel: body.meta?.nlgModel || null,
            nlgLatencyMs: body.meta?.nlgLatencyMs || null,
          });
        } catch (_) {}
      }

      // HTTP status code mapping
      const code = body.code;
      const status =
        code === 'MISSING_LOCATION'
          ? 400
          : code === 'RESTAURANT_NOT_FOUND'
            ? 400
            : code === 'AMBIGUOUS'
              ? 422
              : 200;

      return res.status(status).json(body);
    } catch (err) {
      console.error('AI query error:', err);
      return res.status(500).json({ error: 'AI query failed.' });
    }
  },
};
