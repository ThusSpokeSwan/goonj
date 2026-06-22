import { prisma } from './db';

export interface VectorRecord {
  id: string;
  schemeId: string;
  text: string;
  embedding: number[];
}

/**
 * Calculates the cosine similarity score between two vector arrays of the same length.
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    return 0; // Length mismatch
  }
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export class LocalVectorStore {
  /**
   * Adds multiple text chunks with their embeddings to the database vector store.
   */
  public static async addChunks(
    chunks: { schemeId: string; text: string; embedding: number[] }[]
  ): Promise<void> {
    try {
      await prisma.schemeVector.createMany({
        data: chunks.map(chunk => ({
          schemeId: chunk.schemeId,
          text: chunk.text,
          embedding: JSON.stringify(chunk.embedding),
        }))
      });
    } catch (error) {
      console.error('Error adding chunks to db vector store:', error);
      throw error;
    }
  }

  /**
   * Performs cosine similarity search across matching scheme IDs directly in database.
   * If a list of targetSchemeIds is passed, only searches within those schemes (Metadata filtering).
   */
  public static async search(
    queryVector: number[],
    targetSchemeIds?: string[],
    topK: number = 5
  ): Promise<{ schemeId: string; text: string; score: number }[]> {
    try {
      // Step 1: Filter records by scheme IDs directly in the DB query
      const records = await prisma.schemeVector.findMany({
        where: targetSchemeIds ? {
          schemeId: { in: targetSchemeIds }
        } : undefined
      });
        
      // Step 2: Compute cosine similarity for each candidate chunk
      const results = records.map(record => {
        const embedding = JSON.parse(record.embedding) as number[];
        const score = cosineSimilarity(queryVector, embedding);
        return {
          schemeId: record.schemeId,
          text: record.text,
          score,
        };
      });
      
      // Step 3: Sort by descending score and take top K
      results.sort((a, b) => b.score - a.score);
      return results.slice(0, topK);
    } catch (error) {
      console.error('Error searching vectors in db:', error);
      return [];
    }
  }

  /**
   * Deletes all vectors corresponding to a specific scheme.
   */
  public static async deleteBySchemeId(schemeId: string): Promise<void> {
    try {
      await prisma.schemeVector.deleteMany({
        where: { schemeId }
      });
    } catch (error) {
      console.error('Error deleting vectors by schemeId:', error);
      throw error;
    }
  }

  /**
   * Clears the entire database of vectors.
   */
  public static async clearAll(): Promise<void> {
    try {
      await prisma.schemeVector.deleteMany({});
    } catch (error) {
      console.error('Error clearing all vectors:', error);
      throw error;
    }
  }
}
