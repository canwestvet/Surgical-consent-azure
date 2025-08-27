import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const __dirname = path.resolve();

// Serve static files (your consent form HTML must be in project root)
app.use(express.static(__dirname));

// Middleware to parse JSON bodies
app.use(express.json());

// Email sending route
app.post("/send-email", upload.none(), async (req, res) => {
  try {
    const { ownerName, petName, services, complications, cprConsent, signature } = req.body;

    const emailContent = `
      Consent Form Submission:

      Owner: ${ownerName}
      Pet: ${petName}
      Services: ${services}
      Complications Discussed: ${complications}
      CPR Consent: ${cprConsent}
      Signature: ${signature ? "Attached" : "Not provided"}
    `;

    const message = {
      message: {
        subject: `Consent Form for ${petName}`,
        body: {
          contentType: "Text",
          content: emailContent,
        },
        toRecipients: [
          {
            emailAddress: {
              address: process.env.RECIPIENT_EMAIL, // set in .env
            },
          },
        ],
      },
    };

    const response = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
      method: "POST",
