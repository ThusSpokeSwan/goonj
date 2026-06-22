import fs from 'fs';
import path from 'path';

// Parse .env file manually at startup
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

const mockProfile = {
  state: 'Bihar',
  age: 20,
  gender: 'Female',
  casteCategory: 'General',
  annualIncome: 150000,
  occupation: 'student',
  disabilityStatus: 'No',
  disabilityPercentage: 0
};

const mockNeeds = 'housing help';
const detectedLanguage = 'english';

async function testMatch() {
  // Load imports inside async context
  const { prisma } = await import('./src/lib/db.js');
  const { LocalVectorStore } = await import('./src/lib/vectorStore.js');
  const { getEmbedding, synthesizeEligibility } = await import('./src/lib/gemini.js');

  try {
    console.log('1. Querying candidate schemes from DB...');
    const candidateSchemes = await prisma.scheme.findMany({
      where: {
        isActive: true,
        state: {
          in: [mockProfile.state, 'Central', 'central'],
        },
        OR: [
          { minAge: null },
          { minAge: { lte: mockProfile.age } }
        ],
        AND: [
          {
            OR: [
              { maxAge: null },
              { maxAge: { gte: mockProfile.age } }
            ]
          },
          {
            genderRestriction: {
              in: [mockProfile.gender, 'All', 'all'],
            }
          },
          {
            OR: [
              { incomeCeiling: null },
              { incomeCeiling: { gte: mockProfile.annualIncome } }
            ]
          }
        ]
      }
    });

    console.log(`- Found ${candidateSchemes.length} candidate schemes from DB.`);
    for (const s of candidateSchemes) {
      console.log(`  * ${s.title} (State: ${s.state}, Gender: ${s.genderRestriction})`);
    }

    console.log('\n2. Programmatic filter for caste and occupation...');
    const userOccupation = mockProfile.occupation.toLowerCase().trim();
    const userCaste = mockProfile.casteCategory.toLowerCase().trim();
    
    const fullyMatchingSchemes = candidateSchemes.filter(scheme => {
      if (scheme.occupations && scheme.occupations.trim() !== '') {
        const allowedOccupations = scheme.occupations.toLowerCase().split(',').map(o => o.trim());
        const hasMatchingJob = allowedOccupations.includes(userOccupation) || 
                               allowedOccupations.includes('all') || 
                               allowedOccupations.length === 0;
        if (!hasMatchingJob) return false;
      }
      
      if (scheme.casteCategories && scheme.casteCategories.trim() !== '') {
        const allowedCastes = scheme.casteCategories.toLowerCase().split(',').map(c => c.trim());
        const hasMatchingCaste = allowedCastes.includes(userCaste) || 
                                 allowedCastes.includes('all') || 
                                 allowedCastes.length === 0;
        if (!hasMatchingCaste) return false;
      }
      
      return true;
    });

    console.log(`- Surviving schemes: ${fullyMatchingSchemes.length}`);
    for (const s of fullyMatchingSchemes) {
      console.log(`  * ${s.title}`);
    }

    if (fullyMatchingSchemes.length === 0) return;

    console.log('\n3. Generating query embedding and searching vector store...');
    const queryVector = await getEmbedding(mockNeeds);
    const candidateIds = fullyMatchingSchemes.map(s => s.id);
    const searchResults = await LocalVectorStore.search(queryVector, candidateIds, 15);
    console.log(`- Found ${searchResults.length} vector chunks matching the candidates.`);
    for (const r of searchResults) {
      console.log(`  * Chunk score: ${r.score.toFixed(4)}, SchemeId: ${r.schemeId}, Text snippet: "${r.text.substring(0, 80)}..."`);
    }

    const chunksByScheme = new Map();
    for (const match of searchResults) {
      const chunks = chunksByScheme.get(match.schemeId) || [];
      if (chunks.length < 3) {
        chunks.push(match.text);
      }
      chunksByScheme.set(match.schemeId, chunks);
    }

    const schemesDataForSynthesis = fullyMatchingSchemes
      .map(scheme => ({
        id: scheme.id,
        title: scheme.title,
        ministry: scheme.ministry,
        chunks: chunksByScheme.get(scheme.id) || [scheme.applicationSteps],
      }))
      .sort((a, b) => {
        const hasA = chunksByScheme.has(a.id) ? 1 : 0;
        const hasB = chunksByScheme.has(b.id) ? 1 : 0;
        return hasB - hasA;
      });

    console.log('\n4. Running Gemini synthesizeEligibility...');
    const eligibilityResults = await synthesizeEligibility(
      mockProfile,
      mockNeeds,
      schemesDataForSynthesis.slice(0, 5),
      detectedLanguage
    );
    console.log('Eligibility synthesis results:');
    console.log(JSON.stringify(eligibilityResults, null, 2));

  } catch (error) {
    console.error('Test match failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testMatch();
