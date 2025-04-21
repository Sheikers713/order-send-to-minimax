const axios = require('axios');
const getShopifyOrder = require('./getShopifyOrder');
const getAccessToken = require('./getAccessToken');
const findItemSafe = require('./findItemSafe');

const MINIMAX = {
  organisationId: 68216
};
const MINIMAX_API = `https://moj.minimax.rs/RS/API/api/orgs/${MINIMAX.organisationId}`;

/// === Создание клиента ===
async function createCustomer(token, order) {
  const billing = order.billing_address;
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

    console.log('✅ Клиент создан в Minimax');
    console.log('🧾 Ответ Minimax при создании клиента:', res.data);

    const customerId = res.data?.CustomerId || await findCustomerId(token, code);

    if (customerId) {
      await addCustomerContact(token, customerId, {
        fullName: `${billing.first_name || ''} ${billing.last_name || ''}`.trim(),
        email: billing.email || order.email || '',
        phone: billing.phone || ''
      });

      return customerId;
    }

    console.warn('⚠️ Не удалось получить ID клиента даже после поиска');
    return null;

  } catch (err) {
    if (err.response?.status === 409) {
      console.warn('⚠️ Клиент уже существует. Пробуем найти его по коду...');
      return await findCustomerId(token, code);
    }

    console.error('🛑 Ошибка при создании клиента:', err.response?.data || err.message);
    return null;
  }
}


// === Добавляем контакт покупателю ===
async function addCustomerContact(token, customerId, contact) {
  let fullName = (contact.fullName || '').trim();
  if (!fullName) {
    console.warn('⚠️ Нет имени — используем "Shopify Kupac"');
    fullName = 'Shopify Kupac';
  }

  const email = contact.email?.trim();
  const phone = contact.phone?.trim();

  const data = {
    FullName: fullName,
    Email: email || undefined,
    PhoneNumber: phone || undefined,
    Default: "D"
  };

  console.log('📨 Добавляем контакт к клиенту:', JSON.stringify(data, null, 2));

  try {
    await axios.post(`${MINIMAX_API}/customers/${customerId}/contacts`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Контакт добавлен к клиенту');
  } catch (err) {
    console.warn('⚠️ Ошибка при добавлении контакта к клиенту:', err.response?.data || err.message);
  }
}
// === Поиск клиента по коду ===
async function findCustomerId(token, code) {
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

// === Создание документа "Primljena narudžbina" (боевой) ===
async function createReceivedOrder(token, order, customerId) {
  const billing = order.billing_address;
  const orderRows = [];

  for (const item of order.line_items) {
    const minimaxItem = await findItemSafe(token, item.sku);
    if (!minimaxItem) {
      throw new Error(`❌ Артикул ${item.sku} не найден. Заказ не создан.`);
    }

orderRows.push({
  Item: { ID: minimaxItem.ItemId },
  ItemCode: minimaxItem.Code,
  ItemName: minimaxItem.Name,
  Quantity: item.quantity,
  Price: parseFloat(item.price), // ← используем Price вместо UnitPrice
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
    IsPriceWithVAT: true
  };

  const url = `${MINIMAX_API}/orders`;
  console.log('📤 Отправляем боевой заказ в Minimax:\n', JSON.stringify(data, null, 2));

  try {
    const res = await axios.post(url, data, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Боевой заказ создан в Minimax! ID:', res.data.ID || res.data);
  } catch (err) {
    console.error('🛑 Ошибка при создании боевого заказа в Minimax!');
    if (err.response) {
      console.error('📥 Ответ Minimax:', err.response.data);
      console.error('📟 Код ответа:', err.response.status);
    } else {
      console.error(err.message);
    }
  }
}

// === Получение заказа по ID ===
async function getOrderById(token, orderId) {
  const url = `${MINIMAX_API}/orders/${orderId}`;
  console.log('📡 Пытаемся получить заказ по URL:', url);
  try {
    const res = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log('✅ Заказ получен:\n', JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error('🛑 Ошибка при получении заказа:', err.response?.data || err.message);
  }
}

// === Список заказов ===
async function listOrders(token) {
  const url = `${MINIMAX_API}/orders?pageSize=5&page=1`;
  try {
    const res = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log('✅ Найдены заказы:\n', JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error('🛑 Ошибка при получении списка заказов:', err.response?.data || err.message);
  }
}

// === Тестовый заказ ===
async function createTestOrder(token) {
  const url = `${MINIMAX_API}/orders`;

  const now = new Date().toISOString().split("T")[0];

  const data = {
    DocumentType: "ReceivedOrder",
    Date: now,
    DueDate: now,
    ReceivedIssued: "P", // P = Primljena, обязательно!
    Customer: { ID: 6741695 },
    CustomerName: "Viktor Pećić",
    CustomerAddress: "Moše Pijade 56/4",
    CustomerPostalCode: "19210",
    CustomerCity: "Bor",
    CustomerCountry: { ID: 3, Name: "RS" },
    CustomerCountryName: "Serbia",
    Analytic: 107239,
    Currency: { ID: 2, Name: "RSD" },
    Reference: "#TEST-ORDER",
    Notes: "Test order via API",
    DescriptionBelow: "Potvrđujemo Vašu porudžbinu koja je prikazana u ovom dokumentu.",
    Status: "P",
OrderRows: [
  {
    Item: { ID: 9381563 },
    ItemName: "Enya EAC-02 Capo",
    ItemCode: "EAC-02",
    Quantity: 1,
    Price: 1500, // ← вместо UnitPrice
    UnitOfMeasurement: "kom",
    Warehouse: { ID: 34524 }
  }
],
    IsPriceWithVAT: true
  };

  console.log('📤 Отправляем тестовый заказ:\n', JSON.stringify(data, null, 2));

  try {
    const res = await axios.post(url, data, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Заказ создан! ID:', res.data.ID || res.data);
  } catch (err) {
    console.error('🛑 Ошибка при создании заказа!');
    if (err.response) {
      console.error('📥 Ответ:', err.response.data);
      console.error('📟 Статус:', err.response.status);
    } else {
      console.error(err.message);
    }
  }
}

// === Главный запуск ===
(async () => {
  const token = await getAccessToken();
  const orderId = 6228850671938;
  const order = await getShopifyOrder(orderId);

  if (!order) {
    console.error('🛑 Не удалось получить заказ.');
    return;
  }

  const customerId = await createCustomer(token, order);
  
  if (!customerId) {
    console.error('🛑 Не удалось создать/получить клиента.');
    return;
  }

   await createReceivedOrder(token, order, customerId);
  // await listOrders(token);
  // await getOrderById(token, 171347);
  // await createTestOrder(token);
})();