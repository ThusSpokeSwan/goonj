import fs from 'fs/promises';
import path from 'path';

export interface VectorRecord {
  id: string;
  schemeId: string;
  text: string;
  embedding: number[];
}

const VECTORS_FILE = path.join(process.cwd(), 'prisma', 'vectors.json');

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
   * Reads the vector store file from disk. Returns empty list if file doesn't exist.
   */
  private static async load(): Promise<VectorRecord[]> {
    try {
      const content = await fs.readFile(VECTORS_FILE, 'utf-8');
      return JSON.parse(content) as VectorRecord[];
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return [];
      }
      console.error('Error loading vector store file:', error);
      return [];
    }
  }

  /**
   * Overwrites the vector store file on disk.
   */
  private static async save(records: VectorRecord[]): Promise<void> {
    try {
      // Ensure the directory exists
      await fs.mkdir(path.dirname(VECTORS_FILE), { recursive: true });
      await fs.writeFile(VECTORS_FILE, JSON.stringify(records, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error saving vector store file:', error);
      throw error;
    }
  }

  /**
   * Adds multiple text chunks with their embeddings to the vector store.
   */
  public static async addChunks(
    chunks: { schemeId: string; text: string; embedding: number[] }[]
  ): Promise<void> {
    const records = await this.load();
    const newRecords = chunks.map(chunk => ({
      id: crypto.randomUUID(),
      schemeId: chunk.schemeId,
      text: chunk.text,
      embedding: chunk.embedding,
    }));
    
    records.push(...newRecords);
    await this.save(records);
  }

  /**
   * Performs cosine similarity search across matching scheme IDs.
   * If a list of targetSchemeIds is passed, only searches within those schemes (Metadata filtering).
   */
  public static async search(
    queryVector: number[],
    targetSchemeIds?: string[],
    topK: number = 5
  ): Promise<{ schemeId: string; text: string; score: number }[]> {
    const records = await this.load();
    
    // Step 1: Filter records by scheme IDs (Metadata Filter integration)
    const filteredRecords = targetSchemeIds
      ? records.filter(r => targetSchemeIds.includes(r.schemeId))
      : records;
      
    // Step 2: Compute cosine similarity for each candidate chunk
    const results = filteredRecords.map(record => {
      const score = cosineSimilarity(queryVector, record.embedding);
      return {
        schemeId: record.schemeId,
        text: record.text,
        score,
      };
    });
    
    // Step 3: Sort by descending score and take top K
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }

  /**
   * Deletes all vectors corresponding to a specific scheme.
   */
  public static async deleteBySchemeId(schemeId: string): Promise<void> {
    const records = await this.load();
    const filtered = records.filter(r => r.schemeId !== schemeId);
    await this.save(filtered);
  }

  /**
   * Clears the entire database of vectors.
   */
  public static async clearAll(): Promise<void> {
    await this.save([]);
  }
}
