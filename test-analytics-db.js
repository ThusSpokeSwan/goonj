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

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Querying search history by language...");
    const languageGroups = await prisma.searchHistory.groupBy({
      by: ['detectedLanguage'],
      _count: {
        _all: true
      },
      orderBy: {
        _count: {
          detectedLanguage: 'desc'
        }
      },
      take: 5
    });
    console.log("Language groups result:", JSON.stringify(languageGroups, null, 2));

    console.log("Querying search history by state...");
    const stateGroups = await prisma.searchHistory.groupBy({
      by: ['state'],
      _count: {
        _all: true
      },
      orderBy: {
        _count: {
          state: 'desc'
        }
      },
      take: 5
    });
    console.log("State groups result:", JSON.stringify(stateGroups, null, 2));

    console.log("Querying feedback stats...");
    const feedbackTotal = await prisma.feedback.count();
    console.log("Total feedback count:", feedbackTotal);
    
    console.log("Analytics test succeeded with no errors!");
  } catch (error) {
    console.error("FAILED with error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
