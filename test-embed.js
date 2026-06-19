const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || ''
});

async function testModel(modelName) {
  try {
    console.log(`Testing model: ${modelName}...`);
    const response = await ai.models.embedContent({
      model: modelName,
      contents: "Hello world",
    });
    console.log(`Success with ${modelName}! Length of embeddings:`, response.embeddings?.[0]?.values?.length);
    return true;
  } catch (error) {
    console.error(`Failed for ${modelName}:`, error.message);
    return false;
  }
}

async function main() {
  await testModel('gemini-embedding-2');
  await testModel('gemini-embedding-001');
}

main();
