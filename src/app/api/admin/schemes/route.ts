import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { LocalVectorStore } from '@/lib/vectorStore';
import { extractTextFromPdf, extractTextFromUrl, chunkText } from '@/lib/parser';
import { getEmbedding } from '@/lib/gemini';

/**
 * GET /api/admin/schemes
 * Returns a list of all schemes registered in the SQLite database.
 */
export async function GET() {
  try {
    const schemes = await prisma.scheme.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ success: true, schemes });
  } catch (error: any) {
    console.error('Error fetching schemes:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve schemes list.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/schemes
 * Ingests a new scheme. Supports metadata fields, PDF uploads, or web URLs.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Extract metadata fields
    const title = formData.get('title') as string;
    const ministry = formData.get('ministry') as string | null;
    const state = formData.get('state') as string;
    const minAgeStr = formData.get('minAge') as string | null;
    const maxAgeStr = formData.get('maxAge') as string | null;
    const genderRestriction = (formData.get('genderRestriction') as string) || 'All';
    const incomeCeilingStr = formData.get('incomeCeiling') as string | null;
    const occupations = (formData.get('occupations') as string) || '';
    const casteCategories = (formData.get('casteCategories') as string) || '';
    const expiryDateStr = formData.get('expiryDate') as string | null;
    const applicationSteps = (formData.get('applicationSteps') as string) || 'Synthesized on the fly';
    
    // Document source options
    const linkUrl = formData.get('linkUrl') as string | null;
    const pdfFile = formData.get('file') as File | null;
    
    if (!title || !state) {
      return NextResponse.json(
        { success: false, error: 'Title and State are required fields.' },
        { status: 400 }
      );
    }
    
    // Parse numeric/date options
    const minAge = minAgeStr ? parseInt(minAgeStr, 10) : null;
    const maxAge = maxAgeStr ? parseInt(maxAgeStr, 10) : null;
    const incomeCeiling = incomeCeilingStr ? parseFloat(incomeCeilingStr) : null;
    const expiryDate = expiryDateStr ? new Date(expiryDateStr) : null;
    
    // Step 1: Extract raw text content from the provided source
    let rawText = '';
    let documentUrl = '';
    
    if (pdfFile && pdfFile.name !== 'undefined' && pdfFile.size > 0) {
      console.log(`Extracting text from uploaded PDF: ${pdfFile.name}`);
      const arrayBuffer = await pdfFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      rawText = await extractTextFromPdf(buffer);
      documentUrl = `Uploaded PDF: ${pdfFile.name}`;
    } else if (linkUrl && linkUrl.trim() !== '') {
      console.log(`Extracting text from website link: ${linkUrl}`);
      rawText = await extractTextFromUrl(linkUrl.trim());
      documentUrl = linkUrl.trim();
    } else {
      return NextResponse.json(
        { success: false, error: 'Please supply either a guideline PDF file or a webpage link URL.' },
        { status: 400 }
      );
    }
    
    if (!rawText || rawText.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Could not extract any text content from the supplied source.' },
        { status: 400 }
      );
    }
    
    // Step 2: Create the SQLite database scheme record
    const scheme = await prisma.scheme.create({
      data: {
        title,
        ministry,
        state,
        minAge,
        maxAge,
        genderRestriction,
        incomeCeiling,
        occupations,
        casteCategories,
        expiryDate,
        applicationSteps,
        documentUrl,
      },
    });
    
    // Step 3: Segment text and generate embeddings
    console.log('Chunking extracted guideline text...');
    const chunks = chunkText(rawText);
    console.log(`Generated ${chunks.length} chunks. Creating embeddings...`);
    
    const vectorChunks = [];
    for (const chunk of chunks) {
      // Generate embedding vector via Gemini
      const embedding = await getEmbedding(chunk);
      vectorChunks.push({
        schemeId: scheme.id,
        text: chunk,
        embedding,
      });
    }
    
    // Step 4: Write vectors to the local database file
    console.log('Writing embeddings to LocalVectorStore...');
    await LocalVectorStore.addChunks(vectorChunks);
    
    return NextResponse.json({
      success: true,
      schemeId: scheme.id,
      chunksProcessed: chunks.length,
      message: 'Scheme successfully ingested and vectorized!',
    });
    
  } catch (error: any) {
    console.error('Error in scheme ingestion route:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to ingest scheme.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/schemes
 * Purges a scheme from the SQLite catalog and deletes all its associated vector embeddings.
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Scheme ID is required in the query parameters.' },
        { status: 400 }
      );
    }
    
    // 1. Delete vectors from vector file
    await LocalVectorStore.deleteBySchemeId(id);
    
    // 2. Delete scheme row from SQLite
    await prisma.scheme.delete({
      where: { id },
    });
    
    return NextResponse.json({
      success: true,
      message: 'Scheme and its vector index deleted successfully!',
    });
  } catch (error: any) {
    console.error('Error in scheme deletion route:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete scheme.' },
      { status: 500 }
    );
  }
}
