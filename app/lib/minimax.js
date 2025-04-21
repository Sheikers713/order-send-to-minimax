// /lib/minimax.js
import axios from 'axios';
import { getAccessToken } from './getAccessToken';
import { getShopifyOrder } from './getShopifyOrder';
import findItemSafe from './findItemSafe';

const MINIMAX = {
  organisationId: 68216
};
const MINIMAX_API = `https://moj.minimax.rs/RS/API/api/orgs/${MINIMAX.organisationId}`;

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

export async function createReceivedOrder(token, order, customerId) {
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
    IsPriceWithVAT: true
  };

  await axios.post(`${MINIMAX_API}/orders`, data, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
}
