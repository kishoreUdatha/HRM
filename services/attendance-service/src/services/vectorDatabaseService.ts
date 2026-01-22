// Vector Database Service for Face Embeddings using Qdrant
import { QdrantClient } from '@qdrant/js-client-rest';
import { v4 as uuidv4 } from 'uuid';

// Interfaces
export interface VectorSearchResult {
  employeeId: string;
  employeeName: string;
  tenantId: string;
  score: number;
  distance: number;
}

export interface EmbeddingPayload {
  tenantId: string;
  employeeId: string;
  employeeName: string;
  updatedAt: string;
  enrollmentVersion: number;
  [key: string]: unknown; // Index signature for Qdrant compatibility
}

// Configuration
const CONFIG = {
  COLLECTION_NAME: 'face_embeddings',
  VECTOR_SIZE: 128, // face-api.js uses 128-dim embeddings
  DISTANCE_METRIC: 'Cosine' as const,
  DEFAULT_SEARCH_LIMIT: 5,
  DEFAULT_SCORE_THRESHOLD: 0.7, // Cosine similarity threshold
};

class VectorDatabaseService {
  private client: QdrantClient | null = null;
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;

  /**
   * Initialize connection to Qdrant
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initializationPromise) return this.initializationPromise;

    this.initializationPromise = this._doInitialize();
    return this.initializationPromise;
  }

  private async _doInitialize(): Promise<void> {
    try {
      const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
      const qdrantApiKey = process.env.QDRANT_API_KEY;

      console.log(`[VectorDB] Connecting to Qdrant at ${qdrantUrl}`);

      this.client = new QdrantClient({
        url: qdrantUrl,
        apiKey: qdrantApiKey,
      });

      // Check if collection exists, create if not
      await this.ensureCollectionExists();

      this.initialized = true;
      console.log('[VectorDB] Successfully connected to Qdrant');
    } catch (error: any) {
      console.error('[VectorDB] Failed to initialize Qdrant:', error.message);
      // Don't throw - allow fallback to MongoDB-only mode
      this.initialized = false;
    }
  }

  /**
   * Ensure the face_embeddings collection exists
   */
  private async ensureCollectionExists(): Promise<void> {
    if (!this.client) return;

    try {
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(
        (c) => c.name === CONFIG.COLLECTION_NAME
      );

      if (!exists) {
        console.log(`[VectorDB] Creating collection: ${CONFIG.COLLECTION_NAME}`);

        await this.client.createCollection(CONFIG.COLLECTION_NAME, {
          vectors: {
            size: CONFIG.VECTOR_SIZE,
            distance: CONFIG.DISTANCE_METRIC,
          },
          optimizers_config: {
            indexing_threshold: 10000, // Start indexing after 10k vectors
          },
          hnsw_config: {
            m: 16, // Number of edges per node
            ef_construct: 100, // Construction time/accuracy trade-off
          },
        });

        // Create payload index for tenant filtering (critical for multi-tenant)
        await this.client.createPayloadIndex(CONFIG.COLLECTION_NAME, {
          field_name: 'tenantId',
          field_schema: 'keyword',
        });

        // Create index for employeeId for faster lookups
        await this.client.createPayloadIndex(CONFIG.COLLECTION_NAME, {
          field_name: 'employeeId',
          field_schema: 'keyword',
        });

        console.log(`[VectorDB] Collection ${CONFIG.COLLECTION_NAME} created with indexes`);
      }
    } catch (error: any) {
      console.error('[VectorDB] Error ensuring collection exists:', error.message);
      throw error;
    }
  }

  /**
   * Generate a deterministic point ID from tenant and employee IDs
   */
  private generatePointId(tenantId: string, employeeId: string): string {
    // Create a deterministic UUID-like string from tenant+employee
    // This ensures upserts work correctly (same employee = same point ID)
    const combined = `${tenantId}_${employeeId}`;
    // Use a simple hash-based approach for deterministic IDs
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    // Convert to positive number and use as string ID
    return Math.abs(hash).toString();
  }

  /**
   * Upsert (insert or update) a face embedding
   */
  async upsertEmbedding(params: {
    tenantId: string;
    employeeId: string;
    employeeName: string;
    embedding: number[];
    enrollmentVersion?: number;
  }): Promise<boolean> {
    if (!this.client || !this.initialized) {
      console.log('[VectorDB] Not initialized, skipping upsert');
      return false;
    }

    try {
      const { tenantId, employeeId, employeeName, embedding, enrollmentVersion = 1 } = params;

      // Validate embedding dimension
      if (embedding.length !== CONFIG.VECTOR_SIZE) {
        console.error(`[VectorDB] Invalid embedding dimension: ${embedding.length}, expected ${CONFIG.VECTOR_SIZE}`);
        return false;
      }

      const pointId = this.generatePointId(tenantId, employeeId);

      await this.client.upsert(CONFIG.COLLECTION_NAME, {
        wait: true,
        points: [
          {
            id: pointId,
            vector: embedding,
            payload: {
              tenantId,
              employeeId,
              employeeName,
              updatedAt: new Date().toISOString(),
              enrollmentVersion,
            } as EmbeddingPayload,
          },
        ],
      });

      console.log(`[VectorDB] Upserted embedding for employee ${employeeId} (point ${pointId})`);
      return true;
    } catch (error: any) {
      console.error('[VectorDB] Error upserting embedding:', error.message);
      return false;
    }
  }

  /**
   * Search for similar face embeddings within a tenant
   */
  async searchSimilar(params: {
    tenantId: string;
    embedding: number[];
    limit?: number;
    scoreThreshold?: number;
  }): Promise<VectorSearchResult[]> {
    if (!this.client || !this.initialized) {
      console.log('[VectorDB] Not initialized, returning empty results');
      return [];
    }

    try {
      const {
        tenantId,
        embedding,
        limit = CONFIG.DEFAULT_SEARCH_LIMIT,
        scoreThreshold = CONFIG.DEFAULT_SCORE_THRESHOLD,
      } = params;

      // Validate embedding dimension
      if (embedding.length !== CONFIG.VECTOR_SIZE) {
        console.error(`[VectorDB] Invalid search embedding dimension: ${embedding.length}`);
        return [];
      }

      const startTime = Date.now();

      const results = await this.client.search(CONFIG.COLLECTION_NAME, {
        vector: embedding,
        filter: {
          must: [
            {
              key: 'tenantId',
              match: { value: tenantId },
            },
          ],
        },
        limit,
        score_threshold: scoreThreshold,
        with_payload: true,
      });

      const searchTime = Date.now() - startTime;
      console.log(`[VectorDB] Search completed in ${searchTime}ms, found ${results.length} matches`);

      return results.map((r) => {
        const payload = r.payload as unknown as EmbeddingPayload;
        return {
          employeeId: payload.employeeId,
          employeeName: payload.employeeName,
          tenantId: payload.tenantId,
          score: r.score,
          distance: 1 - r.score, // Convert cosine similarity to distance
        };
      });
    } catch (error: any) {
      console.error('[VectorDB] Error searching embeddings:', error.message);
      return [];
    }
  }

  /**
   * Delete an employee's face embedding
   */
  async deleteEmbedding(tenantId: string, employeeId: string): Promise<boolean> {
    if (!this.client || !this.initialized) {
      return false;
    }

    try {
      const pointId = this.generatePointId(tenantId, employeeId);

      await this.client.delete(CONFIG.COLLECTION_NAME, {
        wait: true,
        points: [pointId],
      });

      console.log(`[VectorDB] Deleted embedding for employee ${employeeId}`);
      return true;
    } catch (error: any) {
      console.error('[VectorDB] Error deleting embedding:', error.message);
      return false;
    }
  }

  /**
   * Get collection statistics
   */
  async getStats(): Promise<{
    totalVectors: number;
    indexedVectors: number;
    status: string;
  } | null> {
    if (!this.client || !this.initialized) {
      return null;
    }

    try {
      const info = await this.client.getCollection(CONFIG.COLLECTION_NAME);
      return {
        totalVectors: info.points_count || 0,
        indexedVectors: info.indexed_vectors_count || 0,
        status: info.status,
      };
    } catch (error: any) {
      console.error('[VectorDB] Error getting stats:', error.message);
      return null;
    }
  }

  /**
   * Check if vector database is available
   */
  isAvailable(): boolean {
    return this.initialized && this.client !== null;
  }

  /**
   * Get tenant embedding count
   */
  async getTenantEmbeddingCount(tenantId: string): Promise<number> {
    if (!this.client || !this.initialized) {
      return 0;
    }

    try {
      const result = await this.client.count(CONFIG.COLLECTION_NAME, {
        filter: {
          must: [
            {
              key: 'tenantId',
              match: { value: tenantId },
            },
          ],
        },
        exact: true,
      });
      return result.count;
    } catch (error: any) {
      console.error('[VectorDB] Error counting tenant embeddings:', error.message);
      return 0;
    }
  }
}

// Export singleton instance
export const vectorDatabaseService = new VectorDatabaseService();
