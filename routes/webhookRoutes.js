const express = require("express");
const router = express.Router();
const webhookController = require("../controllers/webhookController");

// Unified Midtrans webhook — NO AUTH (called by Midtrans server)
// Set this URL in Midtrans Dashboard → Settings → Configuration → Payment Notification URL
// Example: http://api.pusamadaind.com/api/webhooks/midtrans
router.post("/midtrans", webhookController.handleNotification);

module.exports = router;
