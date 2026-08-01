const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeGMapsPlaces(keyword, location) {
  const results = [];
  const seen = new Set();

  let kwClean = keyword.trim();
  if (kwClean.toLowerCase().endsWith('s') && !kwClean.toLowerCase().endsWith('is')) {
    kwClean = kwClean.slice(0, -1);
  }

  // 1. Pesquisa de Alta Densidade por Raio no Overpass (15km)
  try {
    const nomCityUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&countrycodes=br&limit=1`;
    const nomRes = await axios.get(nomCityUrl, {
      headers: { 'User-Agent': 'NexaleCRM-Engine/3.0 (contact@nexalecrm.com.br)' },
      timeout: 5000
    });

    if (nomRes.data && nomRes.data.length > 0) {
      const lat = parseFloat(nomRes.data[0].lat);
      const lon = parseFloat(nomRes.data[0].lon);
      const cityName = nomRes.data[0].display_name.split(',')[0];

      const opQuery = `
        [out:json][timeout:20];
        (
          node["name"](around:15000,${lat},${lon});
          way["name"](around:15000,${lat},${lon});
        );
        out body 300;
      `;

      const opRes = await axios.post('https://overpass-api.de/api/interpreter', 
        'data=' + encodeURIComponent(opQuery), 
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'NexaleCRM-B2B-Engine/3.0 (contact@nexalecrm.com.br)'
          },
          timeout: 8000
        }
      );

      if (opRes.data && Array.isArray(opRes.data.elements)) {
        const kwLower = kwClean.toLowerCase();
        opRes.data.elements.forEach((el, idx) => {
          const tags = el.tags || {};
          const name = tags.name || tags['name:pt'];
          const phone = tags.phone || tags['contact:phone'] || tags['contact:mobile'] || tags['mobile'] || '';

          if (name) {
            const nameLower = name.toLowerCase();
            const isMatch = nameLower.includes(kwLower) ||
              (tags.leisure && tags.leisure.toLowerCase().includes(kwLower)) ||
              (tags.amenity && tags.amenity.toLowerCase().includes(kwLower)) ||
              (tags.shop && tags.shop.toLowerCase().includes(kwLower)) ||
              (tags.sport && tags.sport.toLowerCase().includes(kwLower));

            if (isMatch && !seen.has(nameLower)) {
              seen.add(nameLower);

              let cleanPhone = phone ? phone.split(';')[0].replace(/\D/g, '') : '';
              if (cleanPhone && (cleanPhone.length === 10 || cleanPhone.length === 11)) {
                cleanPhone = '55' + cleanPhone;
              }

              const street = tags['addr:street'] ? `${tags['addr:street']} ${tags['addr:housenumber'] || ''}` : '';

              results.push({
                id: `gmaps-op-${el.id || idx}`,
                empresa: name,
                contato: name,
                telefone: cleanPhone,
                telefoneRaw: phone || 'Não informado',
                endereco: street ? `${street}, ${cityName}` : `${cityName}, RS`,
                categoria: tags.leisure || tags.amenity || tags.shop || keyword,
                website: tags.website || tags['contact:website'] || '',
                origem: 'Google Maps / Places B2B'
              });
            }
          }
        });
      }
    }
  } catch (e) {
    console.warn('[B2B Engine] Overpass error:', e.message);
  }

  // 2. Raspagem direta do Google Local Search HTML
  try {
    const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(keyword + ' ' + location)}&tbm=lcl&hl=pt-BR&gl=br`;
    const gRes = await axios.get(googleUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9'
      },
      timeout: 5000
    });

    if (gRes.data) {
      const $ = cheerio.load(gRes.data);
      $('[data-async-context*="query"]').each((i, el) => {
        const title = $(el).find('div[role="heading"], span.OSrA2b, div.OSrA2b').text().trim();
        const phoneMatch = $(el).text().match(/(?:\+?55\s?)?(?:\(?([1-9]{2})\)?\s?)?(?:9\d{4}|\d{4})[-\s]?\d{4}/);
        
        if (title && title.length > 2 && !seen.has(title.toLowerCase())) {
          seen.add(title.toLowerCase());
          let cleanPhone = phoneMatch ? phoneMatch[0].replace(/\D/g, '') : '';
          if (cleanPhone && (cleanPhone.length === 10 || cleanPhone.length === 11)) {
            cleanPhone = '55' + cleanPhone;
          }

          results.push({
            id: `gmaps-direct-${results.length + 1}`,
            empresa: title,
            contato: title,
            telefone: cleanPhone,
            telefoneRaw: phoneMatch ? phoneMatch[0] : 'Não informado',
            endereco: `${location}, RS`,
            categoria: keyword,
            website: '',
            origem: 'Google Maps / Places B2B'
          });
        }
      });
    }
  } catch (e) {
    console.warn('[B2B Engine] Google Direct Scraper error:', e.message);
  }

  return results;
}

module.exports = { scrapeGMapsPlaces };
