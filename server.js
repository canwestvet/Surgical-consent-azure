import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

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

// Send email using Graph API
async function sendEmail(formData) {
  const accessToken = await getAccessToken();

  const email = {
    message: {
      subject: "New Consent Form Submission",
      body: {
        contentType: "HTML",
        content: `
          <h2>New Consent Form Submission</h2>
