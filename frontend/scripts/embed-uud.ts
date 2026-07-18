import dotenv from "dotenv";

dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ quiet: true });

const argumentsList = process.argv.slice(2);

const readArgumentValue = (name: string) => {
  const argument = argumentsList.find((item) => item.startsWith(`${name}=`));
  return argument?.slice(name.length + 1);
};

const main = async () => {
  const documentId = readArgumentValue("--document-id");

  if (!documentId) {
    throw new Error(
      "Provide the ingested document UUID with --document-id=<uuid>.",
    );
  }

  const { embedDocument } = await import(
    "../src/server/embeddings/embedding.service"
  );
  const result = await embedDocument(documentId);

  console.log("UUD 1945 embedding completed.", result);
};

main().catch((error) => {
  console.error("UUD 1945 embedding failed.", {
    reason: error instanceof Error ? error.message : "Unknown error",
  });
  process.exitCode = 1;
});
