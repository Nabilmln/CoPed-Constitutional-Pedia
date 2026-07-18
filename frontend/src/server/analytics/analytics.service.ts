import { randomUUID } from "node:crypto";

import {
  getPublicStats,
  upsertVisitorSession,
} from "./analytics.repository";

type RegisterVisitDependencies = {
  createSessionId?: () => string;
  saveVisitor?: (sessionId: string, seenAt?: Date) => Promise<void>;
  now?: () => Date;
};

export const registerVisit = async (
  requestedSessionId?: string,
  dependencies: RegisterVisitDependencies = {},
) => {
  const sessionId =
    requestedSessionId ??
    dependencies.createSessionId?.() ??
    randomUUID();
  const saveVisitor = dependencies.saveVisitor ?? upsertVisitorSession;

  await saveVisitor(sessionId, dependencies.now?.() ?? new Date());

  return { sessionId };
};

export const readPublicStats = getPublicStats;
