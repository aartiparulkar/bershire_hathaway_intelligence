import fs from "fs";
import path from "path";
import { db } from "../db/client.js";
import { chunkText } from "./chunker.js";
import { embedText } from "./embeddings.js";
import { PDFParse } from 'pdf-parse';

export async function ingestMultipleDocuments(folderPath: string) {
  try {
    // Read all files from the folder
    console.log(folderPath)
    const files = fs.readdirSync(folderPath);
    
    
    // Filter for supported file types
    const supportedFiles = files.filter(file => 
      file.endsWith('.pdf') || file.endsWith('.txt')
    );

    console.log(`Found ${supportedFiles.length} documents to ingest...`);

    for (const file of supportedFiles) {
      const filePath = path.join(folderPath, file);
      const documentId = path.parse(file).name; // Use filename without extension as documentId
      console.log(filePath);
      try {
        console.log(`Ingesting document: ${file}`);
        
        // For PDF files, you may need to extract text first
        let text: string;
        if (file.endsWith('.pdf')) {
          text = await extractTextFromPDF(filePath);
        } else {
          text = fs.readFileSync(filePath, "utf-8");
        }
        
        if (!text || text.trim().length === 0) {
          console.warn(`  ⚠ No text extracted from ${file}, skipping...`);
          continue;
        }
        
        const chunks = chunkText(text);
        console.log(`  - Chunked into ${chunks.length} chunks`);

        for (let i = 0; i < chunks.length; i++) {
          const embedding = await embedText(chunks[i]);

          console.log(
            Array.isArray(embedding),
            typeof embedding[0],
            embedding.length
          );

          await db.query(
            `
            INSERT INTO document_chunks
            (document_id, chunk_index, content, embedding, metadata)
            VALUES ($1, $2, $3, $4, $5)
            `,
            [
              documentId,
              i,
              chunks[i],
              `[${embedding.join(",")}]`,
              { source: file, ingested_at: new Date().toISOString() }
            ]
          );
        }
        
        console.log(`  ✓ Successfully ingested ${file}`);
      } catch (error) {
        console.error(`  ✗ Error ingesting ${file}:`, error);
      }
    }

    console.log("Document ingestion completed!");
  } catch (error) {
    console.error("Error reading documents folder:", error);
    console.log("📍 Stack trace:", new Error().stack)
    throw error;
  }
}

async function extractTextFromPDF(filePath: string): Promise<string> {
  try {
    const buffer = fs.readFileSync(filePath);
    const uint8Array = new Uint8Array(
      buffer.buffer,
      buffer.byteOffset,
      buffer.byteLength
    );

    const pdfParse = new PDFParse(uint8Array);  

    const data = await pdfParse.getText()
    return data.text;
  } catch (error) {
    console.error(`Error extracting text from PDF ${filePath}:`, error);
    return "";
  }
}
