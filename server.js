import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import dotenv from "dotenv";
import multer from "multer";
import path from "path";

dotenv.config();
const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve the consent form HTML on "/"
app.get("/", (req, res) => {
  res.sendFile(path.resolve("./consent-form.html"));
});

// Serve static assets if needed
app.use(express.static("./"));

// Get Access Token from Microsoft Identity
async function getAccessToken() {
  const url = `https://login.microsoftonline.com/${process.env.OAUTH_TENANT_ID}/oauth2/v2.0/token`;
  const params = new URLSearchParams();
  params.append("client_id", process.env.OAUTH_CLIENT_ID);
  params.append("client_secret", process.env.OAUTH_CLIENT_SECRET);
  params.append("scope", "https://graph.microsoft.com/.default");
  params.append("grant_type", "client_credentials");

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params
  });

  const data = await res.json();
  if (!data.access_token) {
    console.error("Failed to fetch access token:", data);
    throw new Error("No access token received");
  }
  return data.access_token;
}

// Send email with Graph API
async function sendEmail(formData, pdfBuffer, pdfName) {
  const accessToken = await getAccessToken();

  const email = {
    message: {
      subject: "New Consent Form Submission",
      body: {
        contentType: "HTML",
        content: `
          <h2>New Consent Form Submission</h2>
          <p><strong>Owner Name:</strong> ${formData.ownerName || ""}</p>
          <p><strong>Pet Name:</strong> ${formData.petName || ""}</p>
          <p><strong>Procedure:</strong> ${formData.procedure || ""}</p>
          <p><strong>Consent Given:</strong> ${formData.consent || ""}</p>
          <p><strong>Email:</strong> ${formData.email || ""}</p>
        `
      },
      toRecipients: [
        { emailAddress: { address: process.env.OAUTH_USER } }
      ],
      attachments: pdfBuffer
        ? [
            {
              "@odata.type": "#microsoft.graph.fileAttachment",
              name: pdfName || "ConsentForm.pdf",
              contentBytes: pdfBuffer.toString("base64")
            }
          ]
        : []
    }
  };

  const res = await fetch(`https://graph.microsoft.com/v1.0/users/${process.env.OAUTH_USER}/sendMail`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(email)
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error("Failed to send email: " + error);
  }
}

// Route for form submission
app.post("/submit-form", upload.single("pdf"), async (req, res) => {
  try {
    const formData = req.body;
    const pdfBuffer = req.file ? req.file.buffer : null;
    const pdfName = req.file ? req.file.originalname : null;

    await sendEmail(formData, pdfBuffer, pdfName);
    res.json({ success: true, message: "Form submitted and email sent" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Error sending email" });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
