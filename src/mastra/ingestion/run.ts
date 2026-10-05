import { ingestMultipleDocuments } from "./ingest";

async function main() {  await ingestMultipleDocuments(
    "public/Berkshire_Hathaway_Shareholder_Letters"
  );

  console.log("Ingestion complete");
  process.exit(0);
}

main();
