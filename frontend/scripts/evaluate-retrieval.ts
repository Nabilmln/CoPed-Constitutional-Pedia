import { readFile } from "node:fs/promises";
import path from "node:path";

import dotenv from "dotenv";

dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ quiet: true });

type BaselineCase = {
  id: string;
  type: string;
  question: string;
  expected_articles: string[];
  expected_keywords: string[];
  should_answer: boolean;
};

const containsKeyword = (content: string, keyword: string) =>
  content.toLowerCase().includes(keyword.toLowerCase());

const main = async () => {
  const baselinePath = path.resolve(
    process.cwd(),
    "..",
    "tests",
    "fixtures",
    "uud-rag-baseline.json",
  );
  const baseline = JSON.parse(
    await readFile(baselinePath, "utf8"),
  ) as BaselineCase[];
  const { retrieveUudContext } = await import(
    "../src/server/retrieval/retrieval.service"
  );
  const results = [];

  for (const testCase of baseline) {
    const retrieval = await retrieveUudContext({
      query: testCase.question,
      matchCount: 5,
    });
    const returnedArticles = retrieval.results
      .map((result) => result.articleNumber)
      .filter((value): value is string => Boolean(value));
    const combinedContent = retrieval.results
      .map((result) => result.content)
      .join("\n");
    const articleHit =
      testCase.expected_articles.length === 0 ||
      testCase.expected_articles.some((article) =>
        returnedArticles.includes(article),
      );
    const keywordHit =
      testCase.expected_keywords.length === 0 ||
      testCase.expected_keywords.some((keyword) =>
        containsKeyword(combinedContent, keyword),
      );

    results.push({
      id: testCase.id,
      type: testCase.type,
      shouldAnswer: testCase.should_answer,
      returnedChunks: retrieval.results.length,
      topArticle: retrieval.results[0]?.articleNumber ?? null,
      topScore:
        Math.round((retrieval.results[0]?.score ?? 0) * 10000) / 10000,
      articleHit,
      keywordHit,
    });
  }

  const answerable = results.filter((result) => result.shouldAnswer);
  const articleHits = answerable.filter((result) => result.articleHit).length;
  const keywordHits = answerable.filter((result) => result.keywordHit).length;

  console.table(results);
  console.log("Retrieval evaluation completed.", {
    answerableCases: answerable.length,
    articleRecallAt5: articleHits / answerable.length,
    keywordRecallAt5: keywordHits / answerable.length,
    note: "Out-of-domain rejection is implemented in Phase 6.",
  });

  if (articleHits !== answerable.length || keywordHits !== answerable.length) {
    process.exitCode = 1;
  }
};

main().catch((error) => {
  console.error("Retrieval evaluation failed.", {
    reason: error instanceof Error ? error.message : "Unknown error",
  });
  process.exitCode = 1;
});
