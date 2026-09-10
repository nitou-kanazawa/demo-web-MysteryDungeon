/** セッション内で一意な連番IDを払い出す */
export class IdGenerator {
  private next = 1;
  generate(): number {
    return this.next++;
  }
}
