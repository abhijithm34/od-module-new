const express = require("express");
const Setting = require("../models/Setting");
const router = express.Router();
// Only import, do NOT define inline

// GET sender email
router.get("/sender-email", async (req, res) => {
  try {
    const setting = await Setting.findOne({ key: "senderEmail" });
    res.json({ senderEmail: setting ? setting.value : "" });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch sender email" });
  }
});

// UPDATE sender email
router.put("/sender-email", async (req, res) => {
  try {
    const { senderEmail } = req.body;
    if (!senderEmail)
      return res.status(400).json({ message: "Email required" });

    const setting = await Setting.findOneAndUpdate(
      { key: "senderEmail" },
      { value: senderEmail },
      { upsert: true, new: true }
    );
    res.json({ senderEmail: setting.value });
  } catch (err) {
    res.status(500).json({ message: "Failed to update sender email" });
  }
});

// UPDATE sender email password
router.put("/sender-email-password", async (req, res) => {
  try {
    const { senderEmailPassword } = req.body;
    if (!senderEmailPassword)
      return res.status(400).json({ message: "Password required" });

    const setting = await Setting.findOneAndUpdate(
      { key: "senderEmailPassword" },
      { value: senderEmailPassword },
      { upsert: true, new: true }
    );
    res.json({ senderEmailPassword: setting.value });
  } catch (err) {
    res.status(500).json({ message: "Failed to update sender email password" });
  }
});

module.exports = router;
