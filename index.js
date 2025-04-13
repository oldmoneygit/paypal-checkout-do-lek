const axios = require('axios');
const express = require('express');
const app = express();

// IPN DO PAYPAL + CRIA PEDIDO NA SHOPIFY COM MÚLTIPLOS PRODUTOS
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
          customer: {
            first_name: payload.first_name || "Cliente",
            last_name: payload.last_name || "PayPal",
            email: payload.payer_email || "email@fake.com"
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
