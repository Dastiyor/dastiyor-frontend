class Ratelimit {
  constructor() {}
  static slidingWindow() { return {}; }
  async limit() { return { success: true, remaining: 99, reset: Date.now() + 60000 }; }
}
module.exports = { Ratelimit };
