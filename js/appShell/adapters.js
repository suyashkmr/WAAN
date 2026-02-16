export function createAnalyticsRequestTracker() {
  let activeToken = 0;
  return {
    nextToken: () => {
      activeToken += 1;
      return activeToken;
    },
    isCurrent: token => token === activeToken,
  };
}
