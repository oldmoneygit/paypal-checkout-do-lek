require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('views'));

app.get('/', (req, res) => {
  res.redirect('/checkout');
});

  

app.get('/checkout', (req, res) => {
  res.sendFile(__dirname + '/views/checkout.html');
});

app.post('/checkout', (req, res) => {
  const { item_name, amount } = req.body;

  const paypalUrl = `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick` +
    `&business=${process.env.PAYPAL_EMAIL}` +
    `&item_name=${encodeURIComponent(item_name)}` +
    `&amount=${encodeURIComponent(amount)}` +
    `&currency_code=EUR` +
    `&return=${encodeURIComponent(process.env.RETURN_URL)}` +
    `&cancel_return=${encodeURIComponent(process.env.CANCEL_URL)}` +
    `&landing_page=Billing` +
    `&useraction=commit` +
    `&no_note=1` +
    `&locale.x=es_ES` +
    `&image_url=${encodeURIComponent(process.env.LOGO_URL)}` +
    `&page_style=${encodeURIComponent(process.env.PAGE_STYLE)}`;

  res.redirect(paypalUrl);
});

module.exports = app;
