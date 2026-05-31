// Tracks which socket ids belong to each online user. A user may be connected
// from multiple tabs/devices, so we keep a Set per user and only consider them
// offline once their last socket disconnects.
export const onlineUsers = new Map<string, Set<string>>();
