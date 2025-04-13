const axios = require('axios'); // se ainda não instalou: npm install axios

app.post('/ipn', express.urlencoded({ extended: false }), async (req, res) => {
  const payload = req.body;

  // Monta verificação com o PayPal
  const verifyUrl = 'https://ipnpb.paypal.com/cgi-bin/webscr';
  const verifyPayload = new URLSearchParams({ cmd: '_notify-validate', ...payload });

  try {
    const response = await axios.post(verifyUrl, verifyPayload.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    if (response.data === 'VERIFIED' && payload.payment_status === 'Completed') {
      console.log('✅ IPN VERIFICADO');

      // Cria pedido na Shopify
      const shopifyOrder = {
        order: {
          line_items: [
            {
              title: payload.item_name,
              price: payload.mc_gross,
              quantity: 1,
              name: payload.item_name,
            },
          ],
          financial_status: "paid",
          currency: payload.mc_currency,
          customer: {
            first_name: payload.first_name || "Cliente",
            last_name: payload.last_name || "PayPal",
            email: payload.payer_email || "email@fake.com"
          },
          note: `Pedido processado via PayPal IPN - Transaction ID: ${payload.txn_id}`
        }
      };

      const shopifyUrl = `https://${process.env.SHOPIFY_DOMAIN}/admin/api/2023-10/orders.json`;

      const shopifyRes = await axios.post(shopifyUrl, shopifyOrder, {
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
    console.error('Erro IPN:', error.response?.data || error.message);
    res.sendStatus(500);
  }
});
