export interface EnemyVisualFrame {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Local artwork coordinate that remains fixed over the physics body's centre. */
  anchorX: number;
  /** Local artwork coordinate that sits on the collision body's bottom edge. */
  footY: number;
}

export interface EnemyVisualPose {
  texture: string;
  scale: number;
  frame?: EnemyVisualFrame;
}

export interface EnemyVisualAnimation {
  texture: string;
  animation: string;
  frameRate: number;
  scale: number;
  frames: readonly EnemyVisualFrame[];
  repeat: number;
  impactFrame?: number;
}

/** Presentation-only data shared by authored enemies; combat stats remain in EnemyDefinition. */
export interface EnemyVisualConfig {
  idle: EnemyVisualPose;
  walk?: EnemyVisualAnimation;
  attack?: EnemyVisualAnimation;
  body: { width: number; height: number };
  sourceFaces: 'left' | 'right';
}
