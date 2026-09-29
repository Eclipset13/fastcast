class InputBridge {
  left = false;
  right = false;
  jumpQueued = false;
  dashQueued = false;

  consumeJump(): boolean { const value = this.jumpQueued; this.jumpQueued = false; return value; }
  consumeDash(): boolean { const value = this.dashQueued; this.dashQueued = false; return value; }

  reset(): void {
    this.left = false;
    this.right = false;
    this.jumpQueued = false;
    this.dashQueued = false;
  }
}

export const inputBridge = new InputBridge();
