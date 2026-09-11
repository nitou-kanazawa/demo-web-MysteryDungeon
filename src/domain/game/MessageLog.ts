export class MessageLog {
  private readonly entries: string[] = [];

  constructor(private readonly maxEntries = 200) {}

  push(message: string): void {
    this.entries.push(message);
    if (this.entries.length > this.maxEntries) this.entries.shift();
  }

  recent(n: number): readonly string[] {
    return this.entries.slice(-n);
  }

  get all(): readonly string[] {
    return this.entries;
  }
}
