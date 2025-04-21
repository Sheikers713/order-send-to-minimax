// app/lib/getAccessToken.js
import axios from 'axios';

const MINIMAX = {
  client_id: 'acousticunion',
  client_secret: 'acousticunion',
  username: 'au_shopify',
  password: 'Acoust27!c',
  scope: 'minimax.rs'
};

export async function getAccessToken() {
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