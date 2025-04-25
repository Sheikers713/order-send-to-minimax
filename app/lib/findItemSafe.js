// app/lib/findItemSafe.js
import axios from 'axios';

const MINIMAX = {
  client_id: 'acousticunion',
  client_secret: 'acousticunion',
  username: 'au_shopify',
  password: 'Acoust27!c',
  scope: 'minimax.rs',
  organisationId: 68216
};

const BASE_API = `https://moj.minimax.rs/RS/API/api/orgs/${MINIMAX.organisationId}`;

// Cache for in-flight requests to prevent duplicates
const requestCache = new Map();

async function getAccessToken() {
  const tokenUrl = 'https://moj.minimax.rs/RS/AUT/oauth20/token';
  const params = new URLSearchParams({
    grant_type: 'password',
    client_id: MINIMAX.client_id,
    client_secret: MINIMAX.client_secret,
    username: MINIMAX.username,
    password: MINIMAX.password,
    scope: MINIMAX.scope
  });

  const response = await axios.post(tokenUrl, params);
  return response.data.access_token;
}

export default async function findItemSafe(token, code) {
  const cacheKey = `item-${code}`;
  
  // Check if request is already in progress
  if (requestCache.has(cacheKey)) {
    console.log(`🔄 [findItemSafe] Request for code ${code} already in progress, waiting...`);
    return requestCache.get(cacheKey);
  }

  const safeCode = encodeURIComponent(code);
  const urlDirect = `${BASE_API}/items/code(${safeCode})`;

  console.log(`🔍 Поиск артикула по коду: "${code}"`);
  console.log(`➡️ Закодированный код: '${safeCode}'`);
  console.log(`📡 URL запроса: ${urlDirect}`);

  try {
    const requestPromise = (async () => {
      try {
        const res = await axios.get(urlDirect, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const item = res.data;
        console.log(`✅ Найден через GetItemByCode:`, item);
        return {
          ItemId: item.ItemId,
          Code: item.Code,
          Name: item.Name || '',
          UnitOfMeasurement: item.UnitOfMeasurement || 'kom',
          Price: item.Price || 0
        };
      } catch (err) {
        if (err.response?.status === 429) {
          console.log('⚠️ Rate limit hit, waiting before retry...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          return findItemSafe(token, code);
        }
        console.warn(`⚠️ Не найден через GetItemByCode (${code})`);
      }

      const fullUrl = `${BASE_API}/items`;
      console.log(`🔍 Переход к полному просмотру товаров (PageSize=10000)`);
      try {
        const res = await axios.get(fullUrl, {
          headers: { Authorization: `Bearer ${token}` },
          params: { PageSize: 10000 }
        });

        const allItems = res.data.Rows || res.data.Items || res.data;
        if (!Array.isArray(allItems)) {
          console.error('❌ Непредвиденный формат ответа при полном просмотре.');
          return null;
        }

        const match = allItems.find(item => item.Code === code);
        if (match) {
          console.log(`✅ Найден через полный просмотр:`, match);
          return {
            ItemId: match.ItemId,
            Code: match.Code,
            Name: match.Name || match.Title || '',
            UnitOfMeasurement: match.UnitOfMeasurement || 'kom',
            Price: match.Price || 0
          };
        } else {
          console.warn(`⚠️ Не найден ни одним методом: ${code}`);
          return null;
        }
      } catch (err) {
        if (err.response?.status === 429) {
          console.log('⚠️ Rate limit hit, waiting before retry...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          return findItemSafe(token, code);
        }
        console.error(`❌ Ошибка при полном просмотре:`, err.response?.data || err.message);
        return null;
      }
    })();

    // Store the promise in cache
    requestCache.set(cacheKey, requestPromise);

    const result = await requestPromise;
    return result;
  } finally {
    // Clean up cache
    requestCache.delete(cacheKey);
  }
}