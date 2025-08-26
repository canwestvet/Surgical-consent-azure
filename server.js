// server.js
import express from "express";
import multer from "multer";
import { Client } from "@microsoft/microsoft-graph-client";
import "isomorphic-fetch";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();
const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Function to get Microsoft Graph access token using client credentials
async function getAccessToken() {
  const url = `https://login.microsoftonline.com/${process.env.TENANT_ID}/oauth2/v2.0/token`;
  const params = new URLSearchParams();
  params.append("client_id", process.env.CLIENT_ID);
  params.append("client_secret", process.env.CLIENT_SECRET);
  params.append("scope", "https://graph.microsoft.com/.default");
  params.append("grant_type", "client_credentials");

  const response = await fetch(url, {
    method: "POST",
    body: params,
    headers: { "Content-Type": "application/x-www-form-urlencoded" }
  });

  if (!response.ok) {
    throw new Error("Failed to fetch access token");
  }

  const data = await response.json();
  return data.access_token;
}

// Endpoint to receive consent form
app.post("/send-consent", upload.single("pdf"), async (req, res) => {
  try {
    const { ownerEmail, owner, pet, procedure, surgeryDate, consentId } = req.body;
    const pdfBuffer = req.file.buffer;
    const base64Pdf = pdfBuffer.toString("base64");

    // Get fresh access token
    const token = await getAccessToken();

    // Initialize Graph client
    const client = Client.init({
      authProvider: (done) => done(null, token)
    });

    const mail = {
      message: {
        subject: `Consent Form: ${pet} - ${procedure}`,
        body: {
          contentType: "HTML",
          content: `
            Hello ${owner},<br><br>
            Attached is your pet's consent form.<br><br>
            Consent ID: ${consentId}<br>
            Surgery Date: ${surgeryDate}<br><br>
            Creekside Veterinary Hospital
          `
        },
        toRecipients: [
          { emailAddress: { address: ownerEmail } }
        ],
        attachments: [
          {
            "@odata.type": "#microsoft.graph.fileAttachment",
            name: `${pet}_${procedure}_Consent.pdf`,
            contentBytes: base64Pdf
          }
        ]
      },
      saveToSentItems: "true"
    };

    await client.api("/users/YOUR_SENDER_EMAIL/sendMail").post(mail);

    res.json({ success: true, message: "Email sent successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to send email." });
  }
});

// Serve your front-end
app.use(express.static("public"));

app.listen(3000, () => console.log("Server running on port 3000"));
