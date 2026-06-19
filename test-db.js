const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log("Connecting to database...");
    const count = await prisma.scheme.count();
    console.log(`Success! Scheme count: ${count}`);
  } catch (error) {
    console.error("Failed to connect or query:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
