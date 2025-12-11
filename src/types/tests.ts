export type TestStatus = "idle" | "running" | "passed" | "failed";

export interface TestCase {
  id: string;
  name: string;
  description: string;
  category: "integration" | "unit" | "e2e" | "accessibility";
  tags: string[];
  status: TestStatus;
  averageDurationMs: number;
  runCount: number;
  lastRun?: string;
  owner: string;
}

