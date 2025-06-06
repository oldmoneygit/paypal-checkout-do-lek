const express = require('express');
const axios = require('axios');
const app = express();
require('dotenv').config();

// Middleware necessário pra processar POST vindo de forms
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Checkout - redireciona pro PayPal
app.post('/checkout', (req, res) => {
  const { amount, items } = req.body;

  // Armazena temporariamente o carrinho no global
  global.tempCart = items;

  // Define domínio da loja de origem dinamicamente
  const origin = req.headers.origin || 'https://602j2f-ig.myshopify.com';
  const returnUrl = `${origin}/pages/sucesso`;
  const cancelUrl = `${origin}/pages/cancelado`;

  const paypalUrl = `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick` +
    `&business=${process.env.PAYPAL_EMAIL}` +
    `&item_name=Sneaker Snk House` +
    `&amount=${encodeURIComponent(amount)}` +
    `&currency_code=EUR` +
    `&return=${encodeURIComponent(returnUrl)}` +
    `&cancel_return=${encodeURIComponent(cancelUrl)}` +
    `&landing_page=Billing` +
    `&useraction=commit` +
    `&email=` +
    `&no_note=1` +
    `&locale.x=es_ES` +
    `&lc=ES` +
    `&image_url=${encodeURIComponent(process.env.LOGO_URL)}` +
    `&page_style=${encodeURIComponent(process.env.PAGE_STYLE)}`;

  res.redirect(paypalUrl);
 

});

// IPN DO PAYPAL - valida e cria pedido real na Shopify
app.post('/ipn', express.urlencoded({ extended: false }), async (req, res) => {
  const payload = req.body;

  const verifyUrl = 'https://ipnpb.paypal.com/cgi-bin/webscr';
  const verifyPayload = new URLSearchParams({ cmd: '_notify-validate', ...payload });

  try {
    const response = await axios.post(verifyUrl, verifyPayload.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    if (response.data === 'VERIFIED' && payload.payment_status === 'Completed') {
      console.log('✅ IPN VERIFICADO');

      const cartItems = JSON.parse(global.tempCart || '[]');

      const line_items = cartItems.map(item => ({
        variant_id: item.variant_id,
        quantity: item.quantity
      }));

      const orderData = {
        order: {
          line_items,
          financial_status: "paid",
          currency: payload.mc_currency,
          email: payload.payer_email || "sem-email@cliente.com",
          customer: {
            first_name: payload.first_name || "Cliente",
            last_name: payload.last_name || "PayPal"
          },
          shipping_address: {
            first_name: payload.first_name || "Cliente",
            last_name: payload.last_name || "PayPal",
            address1: payload.address_street || "Endereço não informado",
            city: payload.address_city || "Cidade não informada",
            zip: payload.address_zip || "00000",
            country: payload.address_country || "Espanha",
            country_code: payload.address_country_code || "ES",
            phone: payload.contact_phone || "+34 600 000 000"
          },
          note: `Pedido via PayPal IPN - TXN: ${payload.txn_id}`
        }
      };

      const shopifyUrl = `https://${process.env.SHOPIFY_DOMAIN}/admin/api/2023-10/orders.json`;

      const shopifyRes = await axios.post(shopifyUrl, orderData, {
        headers: {
          'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN,
          'Content-Type': 'application/json',
        },
      });

      console.log('✅ Pedido criado na Shopify:', shopifyRes.data.order.id);
    } else {
      console.log('❌ IPN INVÁLIDO OU PENDENTE');
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('❌ ERRO IPN:', error.response?.data || error.message);
    res.sendStatus(500);
  }
});

// Exporta o app pro Vercel
module.exports = app;

app.get('/', (req, res) => {
  res.send('🚀 Backend do checkout PayPal SNK House está online e funcional.');
});

