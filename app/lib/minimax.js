// /lib/minimax.js
import axios from 'axios';
import { getAccessToken } from './getAccessToken';
import { getShopifyOrder } from './getShopifyOrder';
import findItemSafe from './findItemSafe';

const MINIMAX = {
  organisationId: 68216
};
const MINIMAX_API = `https://moj.minimax.rs/RS/API/api/orgs/${MINIMAX.organisationId}`;

// Cache for in-flight requests to prevent duplicates
const requestCache = new Map();

export async function createCustomer(token, order) {
  const billing = order.billing_address;

  if (!billing) {
    console.warn("⚠️ В заказе нет billing_address, пропускаем создание клиента.");
    return null;
  }

  const code = `SHOPIFY_${order.order_number}`;
  const url = `${MINIMAX_API}/customers`;

  const data = {
    Name: `${billing.first_name} ${billing.last_name}`,
    Code: code,
    Address: billing.address1,
    PostalCode: billing.zip,
    City: billing.city,
    Country: { ID: 3, Name: 'RS' },
    SubjectToVAT: 'Ne',
    Currency: { ID: 1, Name: 'RSD' },
    Email: order.email,
    Phone: billing.phone || ''
  };
  try {
    const res = await axios.post(url, data, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const customerId = res.data?.CustomerId || await findCustomerId(token, code);

    if (customerId) {
      await addCustomerContact(token, customerId, {
        fullName: `${billing.first_name || ''} ${billing.last_name || ''}`.trim(),
        email: billing.email || order.email || '',
        phone: billing.phone || ''
      });

      return customerId;
    }

    return null;
  } catch (err) {
    if (err.response?.status === 409) {
      return await findCustomerId(token, code);
    }
    return null;
  }
}

export async function addCustomerContact(token, customerId, contact) {
  let fullName = (contact.fullName || '').trim() || 'Shopify Kupac';

  const data = {
    FullName: fullName,
    Email: contact.email || undefined,
    PhoneNumber: contact.phone || undefined,
    Default: "D"
  };

  await axios.post(`${MINIMAX_API}/customers/${customerId}/contacts`, data, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
}

export async function findCustomerId(token, code) {
  const url = `${MINIMAX_API}/customers/code(${encodeURIComponent(code)})`;
  try {
    const res = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.data.CustomerId;
  } catch {
    return null;
  }
}

export async function getItemByCode(code) {
  const cacheKey = `item-${code}`;
  
  // Check if request is already in progress
  if (requestCache.has(cacheKey)) {
    console.log(`🔄 [getItemByCode] Request for code ${code} already in progress, waiting...`);
    return requestCache.get(cacheKey);
  }

  try {
    console.log(`🔍 Поиск артикула по коду: "${code}"`);
    console.log(`➡️ Закодированный код: '${code}'`);
    console.log(`📡 URL запроса: ${MINIMAX_API}/items/code(${code})`);

    const requestPromise = axios.get(`${MINIMAX_API}/items/code(${code})`, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    // Store the promise in cache
    requestCache.set(cacheKey, requestPromise);

    const response = await requestPromise;
    
    if (response.data) {
      console.log('✅ Найден через GetItemByCode:', response.data);
      return response.data;
    }

    console.log(`⚠️ Не найден через GetItemByCode (${code})`);
    console.log('🔍 Переход к полному просмотру товаров (PageSize=10000)');

    // If not found, try full search
    const fullSearchResponse = await axios.get(`${MINIMAX_API}/items?PageSize=10000`, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    const item = fullSearchResponse.data.Items.find(item => item.Code === code);
    if (item) {
      console.log('✅ Найден через полный просмотр:', item);
      return item;
    }

    throw new Error(`❌ Артикул ${code} не найден.`);
  } catch (error) {
    if (error.response?.status === 429) {
      console.log('⚠️ Rate limit hit, waiting before retry...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      return getItemByCode(code);
    }
    throw error;
  } finally {
    // Clean up cache
    requestCache.delete(cacheKey);
  }
}

export async function findExistingOrder(token, orderNumber) {
  const url = `${MINIMAX_API}/orders`;
  try {
    const res = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        PageSize: 100,
        Reference: `#${orderNumber}`
      }
    });
    
    const orders = res.data.Rows || res.data.Items || res.data;
    if (!Array.isArray(orders)) return null;
    
    return orders.find(order => order.Reference === `#${orderNumber}`);
  } catch (err) {
    console.warn(`⚠️ Error checking for existing order:`, err.message);
    return null;
  }
}

export async function createReceivedOrder(token, order, customerId) {
  // Check if order already exists
  const existingOrder = await findExistingOrder(token, order.order_number);
  if (existingOrder) {
    console.log(`✅ Order #${order.order_number} already exists in Minimax with ID: ${existingOrder.ID}`);
    return existingOrder;
  }

  const billing = order.billing_address;
  const orderRows = [];

  for (const item of order.line_items) {
    const minimaxItem = await findItemSafe(token, item.sku);
    if (!minimaxItem) throw new Error(`❌ Артикул ${item.sku} не найден.`);

    orderRows.push({
      Item: { ID: minimaxItem.ItemId },
      ItemCode: minimaxItem.Code,
      ItemName: minimaxItem.Name,
      Quantity: item.quantity,
      Price: parseFloat(item.price),
      UnitOfMeasurement: minimaxItem.UnitOfMeasurement || "kom",
      Warehouse: { ID: 34524 }
    });
  }

  const date = order.created_at.split('T')[0];

  const data = {
    DocumentType: "ReceivedOrder",
    Date: date,
    DueDate: date,
    ReceivedIssued: "P",
    Customer: { ID: customerId },
    CustomerName: `${billing.first_name} ${billing.last_name}`,
    CustomerAddress: billing.address1,
    CustomerPostalCode: billing.zip,
    CustomerCity: billing.city,
    CustomerCountry: { ID: 3, Name: "RS" },
    CustomerCountryName: billing.country || "Serbia",
    Analytic: 107239,
    Currency: { ID: 2, Name: order.currency || "RSD" },
    Reference: `#${order.order_number}`,
    Notes: `Porudžbina iz Shopify #${order.order_number}`,
    DescriptionBelow: "Potvrđujemo Vašu porudžbinu koja je prikazana u ovom dokumentu.",
    Status: "P",
    OrderRows: orderRows,
    IsPriceWithVAT: true,
    IdempotencyKey: `shopify-${order.order_number}-${Date.now()}`
  };

  const cacheKey = `order-${order.order_number}`;
  
  // Check if order creation is already in progress
  if (requestCache.has(cacheKey)) {
    console.log(`🔄 [createReceivedOrder] Order ${order.order_number} already being created, waiting...`);
    return requestCache.get(cacheKey);
  }

  try {
    console.log('📦 [createReceivedOrder] Creating order in Minimax...');
    console.log('📤 Request data:', JSON.stringify(data, null, 2));
    
    const requestPromise = axios.post(`${MINIMAX_API}/orders`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Idempotency-Key': data.IdempotencyKey
      }
    });

    // Store the promise in cache
    requestCache.set(cacheKey, requestPromise);

    const response = await requestPromise;
    console.log('📥 Response from Minimax:', JSON.stringify(response.data, null, 2));
    
    // Если API вернул пустой массив, но статус 200, считаем что заказ создан успешно
    if (Array.isArray(response.data) && response.data.length === 0) {
      console.log('📝 Empty array response, checking if order was created...');
      // Даем API время на обработку
      await new Promise(resolve => setTimeout(resolve, 1000));
      const createdOrder = await findExistingOrder(token, order.order_number);
      if (createdOrder) {
        console.log('[minimax] ✅ Order created in Minimax with ID:', createdOrder.ID);
        return createdOrder;
      }
    }
    
    // Если получили ID заказа напрямую
    if (response.data?.ID) {
      console.log('[minimax] ✅ Order created in Minimax with ID:', response.data.ID);
      return response.data;
    }
    
    throw new Error('Order creation failed - invalid response format');
  } catch (error) {
    console.error('❌ Error creating order:', error.message);
    if (error.response) {
      console.error('📥 Response data:', error.response.data);
      console.error('📟 Status code:', error.response.status);
      console.error('🔑 Headers:', error.response.headers);
    }
    
    if (error.response?.status === 429) {
      console.log('⚠️ Rate limit hit, waiting before retry...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      return createReceivedOrder(token, order, customerId);
    }
    
    // Check if order was created despite the error
    const existingOrder = await findExistingOrder(token, order.order_number);
    if (existingOrder) {
      console.log(`✅ Order #${order.order_number} was created despite error, returning existing order`);
      return existingOrder;
    }
    
    throw error;
  } finally {
    // Clean up cache
    requestCache.delete(cacheKey);
  }
}
