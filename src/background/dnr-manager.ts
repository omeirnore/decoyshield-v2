const CAPACITY_WARNING_THRESHOLD = 5000;

const KNOWN_RULESETS = ['ads', 'trackers', 'supplementary'] as const;

export type RulesetId = (typeof KNOWN_RULESETS)[number];

export async function enableRuleset(id: RulesetId): Promise<void> {
  await chrome.declarativeNetRequest.updateEnabledRulesets({
    enableRulesetIds: [id],
  });
}

export async function disableRuleset(id: string): Promise<void> {
  await chrome.declarativeNetRequest.updateEnabledRulesets({
    disableRulesetIds: [id],
  });
}

export async function getBlockedCount(since?: number): Promise<number> {
  const result = await chrome.declarativeNetRequest.getMatchedRules({
    ...(since != null ? { minTimeStamp: since } : {}),
  } as chrome.declarativeNetRequest.MatchedRulesFilter);
  return result.rulesMatchedInfo.length;
}

export async function getRulesetStatus(): Promise<
  Array<{ id: string; enabled: boolean }>
> {
  const enabled = await chrome.declarativeNetRequest.getEnabledRulesets();
  return KNOWN_RULESETS.map((id) => ({
    id,
    enabled: enabled.includes(id),
  }));
}

export async function getAvailableRuleCapacity(): Promise<number> {
  return chrome.declarativeNetRequest.getAvailableStaticRuleCount();
}

export async function checkRuleCapacity(): Promise<{
  available: number;
  warning: boolean;
}> {
  const available = await getAvailableRuleCapacity();
  return {
    available,
    warning: available < CAPACITY_WARNING_THRESHOLD,
  };
}
