/* eslint-disable */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const schemeId = 'd39906ad-6e18-4903-8d7f-fb196495a9b5';
  try {
    const vectors = await prisma.schemeVector.findMany({
      where: { schemeId }
    });
    console.log(`Found ${vectors.length} chunks for scheme ${schemeId}:`);
    vectors.forEach((f, idx) => {
      console.log(`\n--- Chunk ${idx + 1} ---`);
      console.log(f.text);
    });
  } catch (error) {
    console.error('Error reading vectors from database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
