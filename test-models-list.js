/* eslint-disable */
const fs = require('fs');
const path = require('path');

// Parse .env manually at startup
try {
  const envContent = fs.readFileSync(path.resolve('.env'), 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const firstEq = trimmed.indexOf('=');
    if (firstEq === -1) continue;
    const key = trimmed.slice(0, firstEq).trim();
    let val = trimmed.slice(firstEq + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
} catch (e) {
  console.error('Failed to load .env manually:', e.message);
}

const { GoogleGenAI } = require('@google/genai');

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

async function main() {
  try {
    const response = await ai.models.list();
    console.log('Available models:');
    for await (const m of response) {
      console.log(`- Name: ${m.name}, Display: ${m.displayName}, Actions: ${m.supportedActions.join(', ')}`);
    }
  } catch (error) {
    console.error('Error listing models:', error);
  }
}

main();
