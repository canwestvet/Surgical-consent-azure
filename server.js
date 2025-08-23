import express from "express";
import nodemailer from "nodemailer";
import multer from "multer";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Serve static files (consent-form.html etc.)
app.use(express.static(__dirname));

// Endpoint for form submission
app.post("/submit", upload.single("pdf"), async (req, res) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,     // e.g. "mail.creeksidevet.ca"
      port: process.env.SMTP_PORT,     // usually 465 (secure) or 587
      secure: process.env.SMTP_PORT == 465, 
      auth: {
        user: process.env.EMAIL_USER,  // e.g. "info@creeksidevet.ca"
        pass: process.env.EMAIL_PASS,  // password from Azure settings
      },
    });

    await transporter.sendMail({
      from: `"Creekside Vet" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // send to your clinic email
      subject: "New Surgical Consent Form",
      text: "A new consent form has been submitted.",
      attachments: [
        {
          filename: req.file.originalname,
          content: req.file.buffer,
        },
      ],
    });

    res.status(200).send("Consent form received and emailed successfully.");
  } catch (err) {
    console.error("Error sending email:", err);
    res.status(500).send("Error sending consent form.");
  }
});

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
