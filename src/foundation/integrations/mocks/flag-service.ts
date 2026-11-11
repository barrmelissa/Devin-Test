import type { FlagChange, FlagServiceAdapter } from "../types";

/** Mock flag service (stands in for e.g. LaunchDarkly): logs the change and returns a change id. */
export class MockFlagServiceAdapter implements FlagServiceAdapter {
  async applyChange(change: FlagChange) {
    const changeId = `fsc_mock_${Date.now()}`;
    console.log(
      `[mock flag service] ${change.key} ${change.environment}: ${change.enabled ? "on" : "off"} at ${change.rolloutPercent}% ` +
        `(requested by ${change.requestedBy}, approved by ${change.approvedBy}) -> ${changeId}`,
    );
    return { changeId, appliedAt: new Date() };
  }
}
