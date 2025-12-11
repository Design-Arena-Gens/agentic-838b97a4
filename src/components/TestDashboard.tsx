'use client';

import { useMemo, useState } from "react";
import { initialTests } from "@/data/initial-tests";
import type { TestCase, TestStatus } from "@/types/tests";

type FilterStatus = TestStatus | "all";

type LogLevel = "info" | "success" | "error";

interface LogEntry {
  id: string;
  level: LogLevel;
  message: string;
  timestamp: string;
}

const STATUS_LABELS: Record<TestStatus, string> = {
  idle: "Idle",
  running: "Running",
  passed: "Passed",
  failed: "Failed",
};

const CATEGORY_LABELS: Record<TestCase["category"], string> = {
  unit: "Unit",
  integration: "Integration",
  e2e: "End-to-End",
  accessibility: "Accessibility",
};

const MAX_LOG_ITEMS = 12;

function formatDuration(ms: number) {
  if (ms < 1000) {
    return `${ms}ms`;
  }

  return `${(ms / 1000).toFixed(2)}s`;
}

function generateUuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function TestDashboard() {
  const [tests, setTests] = useState<TestCase[]>(() =>
    initialTests.map((test) => ({ ...test }))
  );
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [ownerFilter, setOwnerFilter] = useState<"all" | string>("all");
  const [logs, setLogs] = useState<LogEntry[]>(() => []);

  const filteredTests = useMemo(() => {
    return tests.filter((test) => {
      if (filterStatus !== "all" && test.status !== filterStatus) {
        return false;
      }

      if (
        ownerFilter !== "all" &&
        test.owner.toLowerCase() !== ownerFilter.toLowerCase()
      ) {
        return false;
      }

      if (!searchTerm.trim()) {
        return true;
      }

      const needle = searchTerm.toLowerCase();

      return (
        test.name.toLowerCase().includes(needle) ||
        test.description.toLowerCase().includes(needle) ||
        test.tags.some((tag) => tag.toLowerCase().includes(needle))
      );
    });
  }, [tests, filterStatus, searchTerm, ownerFilter]);

  const stats = useMemo(() => {
    const totals = {
      total: tests.length,
      passed: tests.filter((test) => test.status === "passed").length,
      failed: tests.filter((test) => test.status === "failed").length,
      running: tests.filter((test) => test.status === "running").length,
      idle: tests.filter((test) => test.status === "idle").length,
    };

    const passRate =
      totals.total === 0 ? 0 : Math.round((totals.passed / totals.total) * 100);

    const averageDuration =
      totals.total === 0
        ? 0
        : Math.round(
            tests.reduce((acc, test) => acc + test.averageDurationMs, 0) /
              totals.total
          );

    return { ...totals, passRate, averageDuration };
  }, [tests]);

  const owners = useMemo(() => {
    const result = new Set<string>();
    tests.forEach((test) => result.add(test.owner));
    return Array.from(result);
  }, [tests]);

  const recordLog = (level: LogLevel, message: string) => {
    setLogs((current) => {
      const entry: LogEntry = {
        id: generateUuid(),
        level,
        message,
        timestamp: new Date().toISOString(),
      };

      const next = [entry, ...current];
      next.length = Math.min(next.length, MAX_LOG_ITEMS);
      return next;
    });
  };

  const updateTest = (id: string, update: Partial<TestCase>) => {
    setTests((previous) =>
      previous.map((test) => (test.id === id ? { ...test, ...update } : test))
    );
  };

  const handleRun = (id: string) => {
    const target = tests.find((test) => test.id === id);
    if (!target || target.status === "running") {
      return;
    }

    recordLog("info", `Queued "${target.name}" for execution.`);
    updateTest(id, { status: "running" });

    const runDuration = Math.max(
      300,
      Math.min(3000, target.averageDurationMs + Math.random() * 400 - 200)
    );

    window.setTimeout(() => {
      const successBias =
        target.status === "failed" || target.status === "idle" ? 0.55 : 0.72;
      const didPass = Math.random() < successBias;

      updateTest(id, {
        status: didPass ? "passed" : "failed",
        lastRun: new Date().toISOString(),
        runCount: target.runCount + 1,
        averageDurationMs: Math.round(
          (target.averageDurationMs * target.runCount + runDuration) /
            (target.runCount + 1)
        ),
      });

      recordLog(
        didPass ? "success" : "error",
        didPass
          ? `"${target.name}" passed in ${formatDuration(Math.round(runDuration))}.`
          : `"${target.name}" failed. See logs for diagnostics.`
      );
    }, runDuration);
  };

  const handleReset = (id: string) => {
    const target = tests.find((test) => test.id === id);
    if (!target) {
      return;
    }

    updateTest(id, { status: "idle" });
    recordLog("info", `Reset "${target.name}" to idle state.`);
  };

  const handleBulkRun = () => {
    const runnable = tests.filter(
      (test) => test.status !== "running" && test.status !== "passed"
    );

    if (!runnable.length) {
      recordLog("info", "No tests queued. All tests are either passing or busy.");
      return;
    }

    runnable.forEach((test, index) => {
      window.setTimeout(() => handleRun(test.id), index * 150);
    });

    recordLog(
      "info",
      `Launched ${runnable.length} test${runnable.length > 1 ? "s" : ""}.`
    );
  };

  const handleCreateTest = (formData: FormData) => {
    const name = formData.get("name")?.toString().trim() ?? "";
    const description = formData.get("description")?.toString().trim() ?? "";
    const owner = formData.get("owner")?.toString().trim() ?? "";
    const category =
      (formData.get("category")?.toString() as TestCase["category"]) ?? "unit";
    const tags = formData
      .get("tags")
      ?.toString()
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean) ?? [];

    if (!name || !description || !owner) {
      recordLog(
        "error",
        "Cannot create test. Ensure name, description, owner, and tags are provided."
      );
      return;
    }

    const newTest: TestCase = {
      id: generateUuid(),
      name,
      description,
      category,
      tags,
      status: "idle",
      averageDurationMs: 500,
      runCount: 0,
      owner,
    };

    setTests((current) => [newTest, ...current]);
    recordLog("success", `Created "${name}" with ${tags.length} tag(s).`);
  };

  const activeFilters =
    filterStatus === "all" && ownerFilter === "all" && !searchTerm;

  return (
    <div className="dashboard">
      <header className="dashboard__header">
        <div>
          <h1>Quality Signal Control Room</h1>
          <p>
            Keep your automated checks healthy and actionable. Launch targeted
            runs, triage failures, and monitor trends in real time.
          </p>
        </div>
        <button
          className="button button--primary"
          type="button"
          onClick={handleBulkRun}
        >
          Run Failing Tests
        </button>
      </header>

      <section aria-label="Test health metrics" className="dashboard__metrics">
        <MetricCard
          title="Total Tests"
          value={stats.total.toString()}
          caption={`${stats.passed} passing, ${stats.failed} failing`}
        />
        <MetricCard
          title="Pass Rate"
          value={`${stats.passRate}%`}
          caption={`${stats.running} running / ${stats.idle} idle`}
        />
        <MetricCard
          title="Avg Duration"
          value={formatDuration(stats.averageDuration)}
          caption="Rolling mean of last 20 runs"
        />
        <MetricCard
          title="Active Filters"
          value={activeFilters ? "None" : "Custom"}
          caption={
            activeFilters
              ? "Showing all tests"
              : `Status: ${
                  filterStatus === "all" ? "Any" : STATUS_LABELS[filterStatus]
                } • Owner: ${ownerFilter}`
          }
        />
      </section>

      <section className="dashboard__controls" aria-label="Filters">
        <div className="control-field">
          <label className="control-label" htmlFor="search">
            Search
          </label>
          <input
            id="search"
            name="search"
            type="search"
            placeholder="Search by name, description, or tag..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <fieldset className="status-filter">
          <legend>Status</legend>
          <div className="status-filter__buttons">
            {(["all", "passed", "failed", "running", "idle"] as FilterStatus[])
              .map((statusOption) => (
                <button
                  type="button"
                  key={statusOption}
                  className={`button ${
                    filterStatus === statusOption ? "button--selected" : ""
                  }`}
                  onClick={() => setFilterStatus(statusOption)}
                >
                  {statusOption === "all"
                    ? "All"
                    : STATUS_LABELS[statusOption]}
                </button>
              ))}
          </div>
        </fieldset>

        <div className="control-field">
          <label className="control-label" htmlFor="owner-filter">
            Owner
          </label>
          <select
            id="owner-filter"
            value={ownerFilter}
            onChange={(event) => setOwnerFilter(event.target.value)}
          >
            <option value="all">All Teams</option>
            {owners.map((owner) => (
              <option key={owner} value={owner}>
                {owner}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="dashboard__content">
        <div className="test-table" aria-label="Test inventory">
          <header className="test-table__header">
            <h2>Test Inventory</h2>
            <span>
              Showing {filteredTests.length} of {tests.length} definitions
            </span>
          </header>

          {filteredTests.length === 0 ? (
            <p className="empty-state">
              No tests match the selected criteria. Adjust your filters or create
              a new test definition.
            </p>
          ) : (
            <ul className="test-table__list">
              {filteredTests.map((test) => (
                <li key={test.id} className={`test-row status-${test.status}`}>
                  <div>
                    <div className="test-row__title">
                      <span className="badge">{CATEGORY_LABELS[test.category]}</span>
                      <h3>{test.name}</h3>
                    </div>
                    <p>{test.description}</p>
                    <ul className="tag-list">
                      {test.tags.map((tag) => (
                        <li key={tag} className="tag">
                          #{tag}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <dl className="test-row__meta">
                    <div>
                      <dt>Status</dt>
                      <dd>{STATUS_LABELS[test.status]}</dd>
                    </div>
                    <div>
                      <dt>Owner</dt>
                      <dd>{test.owner}</dd>
                    </div>
                    <div>
                      <dt>Last Run</dt>
                      <dd>
                        {test.lastRun
                          ? new Date(test.lastRun).toLocaleString()
                          : "Never"}
                      </dd>
                    </div>
                    <div>
                      <dt>Duration</dt>
                      <dd>{formatDuration(test.averageDurationMs)}</dd>
                    </div>
                    <div>
                      <dt>Run Count</dt>
                      <dd>{test.runCount}</dd>
                    </div>
                  </dl>
                  <div className="test-row__actions">
                    <button
                      type="button"
                      className="button button--primary"
                      disabled={test.status === "running"}
                      onClick={() => handleRun(test.id)}
                    >
                      {test.status === "running" ? "Running…" : "Run"}
                    </button>
                    <button
                      type="button"
                      className="button"
                      onClick={() => handleReset(test.id)}
                    >
                      Reset
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside className="sidebar">
          <form
            className="create-test-form"
            onSubmit={(event) => {
              event.preventDefault();
              handleCreateTest(new FormData(event.currentTarget));
              event.currentTarget.reset();
            }}
          >
            <h2>Create Test Definition</h2>
            <p className="form-helper">
              Ship a new automated check into this workspace. Provide clear
              ownership so triage remains effortless.
            </p>
            <label className="control-label" htmlFor="name">
              Name
            </label>
            <input id="name" name="name" placeholder="Payment capture regression" />

            <label className="control-label" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              placeholder="Explain the objective and assertions covered by this test."
              rows={3}
            />

            <label className="control-label" htmlFor="owner">
              Owner
            </label>
            <input id="owner" name="owner" placeholder="Reliability Crew" />

            <label className="control-label" htmlFor="category">
              Category
            </label>
            <select id="category" name="category" defaultValue="unit">
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>

            <label className="control-label" htmlFor="tags">
              Tags
            </label>
            <input
              id="tags"
              name="tags"
              placeholder="Separate tags with commas, e.g. payments, release-blocker"
            />

            <button className="button button--primary" type="submit">
              Add Test
            </button>
          </form>

          <section className="run-log">
            <h2>Execution Log</h2>
            {logs.length === 0 ? (
              <p className="empty-state">No activity recorded yet.</p>
            ) : (
              <ul>
                {logs.map((log) => (
                  <li key={log.id} data-level={log.level}>
                    <time dateTime={log.timestamp}>
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </time>
                    <p>{log.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </section>
    </div>
  );
}

function MetricCard({
  title,
  value,
  caption,
}: {
  title: string;
  value: string;
  caption: string;
}) {
  return (
    <article className="metric-card">
      <h3>{title}</h3>
      <p>{value}</p>
      <span>{caption}</span>
    </article>
  );
}

