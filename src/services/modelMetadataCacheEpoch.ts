export class ModelMetadataCacheEpoch {
  private value = 0;

  snapshot(): number {
    return this.value;
  }

  invalidate(): number {
    this.value += 1;
    return this.value;
  }

  isCurrent(snapshot: number): boolean {
    return snapshot === this.value;
  }
}
