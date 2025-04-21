// app/lib/getShopifyOrder.js
import axios from 'axios';

const API_VERSION = '2024-04';

// 🔁 Получение заказа по ID
export async function getShopifyOrder(orderId, shop, accessToken) {
  console.log(`📦в getShopifyOrder Получаем заказ из Shopify (ID: ${orderId})...`);
  console.log(`🔐 Магазин: ${shop}`);
  
  const url = `https://${shop}/admin/api/${API_VERSION}/orders/${orderId}.json`;

  try {
    const response = await axios.get(url, {
      headers: {
        'X-Shopify-Access-Token': accessToken
      }
    });

    console.log('✅ в getShopifyOrder Заказ получен!');
    return response.data.order;
  } catch (error) {
    console.error('❌ в getShopifyOrder Ошибка при получении заказа из Shopify.');
    if (error.response) {
      console.error('📨 Статус:', error.response.status);
      console.error('📄 Ответ:', error.response.data);
    } else {
      console.error('⚠️ Ошибка:', error.message);
    }
    return null;
  }
}