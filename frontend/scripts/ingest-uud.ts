import dotenv from "dotenv";

dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ quiet: true });

const argumentsList = process.argv.slice(2);

const readArgumentValue = (name: string) => {
  const argument = argumentsList.find((item) => item.startsWith(`${name}=`));
  return argument?.slice(name.length + 1);
};

const dryRun = argumentsList.includes("--dry-run");
const force = argumentsList.includes("--force");
const sourcePath = readArgumentValue("--path");

const main = async () => {
  const { ingestUudDocument } = await import(
    "../src/server/documents/ingestion.service"
  );

  try {
    const result = await ingestUudDocument({
      sourcePath,
      dryRun,
      force,
    });

    console.log("UUD 1945 ingestion completed.", result);

    if (result.status === "created") {
      console.log(
        "Chunks are stored without embeddings. Run the Phase 4 embedding command next.",
      );
    }
  } catch (error) {
    console.error("UUD 1945 ingestion failed.", {
      reason: error instanceof Error ? error.message : "Unknown ingestion error",
    });
    process.exitCode = 1;
  }
};

void main();
