import express from "express";
import nodemailer from "nodemailer";
import multer from "multer";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Serve static files
app.use(express.static(path.join(__dirname)));

// Parse form data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Endpoint to serve conditions (pre-surgery questions, optional services)
app.get("/conditions", (req, res) => {
  res.json({
    procedures: {
      "Dental Prophylaxis": "Risks include gingival irritation, minor bleeding.",
      "Dental with Extractions": "Risks include infection, pain, bleeding.",
      "Spay (Ovariohysterectomy)": "Risks include hemorrhage, infection, anesthesia complications.",
      "Neuter (Castration)": "Risks include infection, bleeding, anesthesia complications.",
      "Mass Removal": "Risks include infection, recurrence, anesthesia complications.",
      "Cherry Eye Repair": "Risks include infection, recurrence, bleeding.",
      "Other": ""
    },
    preSurgeryQuestions: [
      "Has your pet had any previous anesthesia complications?",
      "Is your pet currently on any medications?",
      "Has your pet had any recent illnesses or vaccinations?"
    ],
    optionalServices: [
      "Pain medications post-surgery",
      "Antibiotics",
      "Microchipping",
      "Fluoride treatment"
    ]
  });
});

// Endpoint to receive consent form PDF
app.post("/send-consent", upload.single("pdf"), async (req, res) => {
  try {
    const { owner, ownerEmail, pet, procedure, surgeryDate } = req.body;
    const pdfBuffer = req.file.buffer;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: `"Creekside Vet" <${process.env.EMAIL_USER}>`,
      to: ownerEmail,
      subject: `Surgical Consent Form — ${pet}`,
      text: `Hello ${owner},\n\nAttached is the surgical consent form for ${pet}.\nProcedure: ${procedure}\nSurgery Date: ${surgeryDate}\n\nThank you.`,
      attachments: [
        {
          filename: `${pet}_${procedure}_Consent.pdf`,
          content: pdfBuffer
        }
      ]
    });

    res.status(200).send("Consent sent successfully.");
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to send consent form.");
  }
});

// Listen on Azure-assigned port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
