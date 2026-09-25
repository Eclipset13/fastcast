/* Anim — выбор клипа для героя по состоянию физики/боя и его отрисовка (с послеобразами рывка). */

function makeActor(id) {
  const skin = SKINS[id], skel = skin.skel ? SKELS[skin.skel] : Rig.humanoid(skin.scale || 1);
  return new Actor(skin, skel, clipsFor(id));
}

const Anim = {
  t: 0, landT: 0,
  update(dt) {
    this.t += dt; this.landT = Math.max(0, this.landT - dt);
    const p = Game.player; if (!p) return;
    this.choose(); p.actor.update(dt);
  },
  land(vy) { this.landT = 0.2; },
  choose() {
    const p = Game.player, a = p.actor;
    if (Game.mode === 'battle') {
      const B = Battle, ps = B.ps;
      if (ps.stagger > 0) return a.play('stagger');
      if (ps.hurtAnim > 0) return a.play('hurt');
      if (ps.cast > 0) return a.play(B.castClip);
      if (B.parser.isActive) return a.play(a.clips.channel ? 'channel' : 'idle');
      return a.play('idle');
    }
    if (p.dashT > 0) return a.play('dash');
    if (!p.onGround) return a.play(p.vy < 0 ? 'jump' : 'fall');
    if (this.landT > 0) return a.play('land');
    if (p.moving) return a.play('run');
    a.play('idle');
  },
  drawPlayer(ctx, x, y) {
    const p = Game.player, a = p.actor, flip = p.face < 0;
    if (p.dashT > 0 && Math.floor(this.t * 60) % 2 === 0) {
      const pose = a.pose(), up = a.upright();
      FX.ghost((c, col) => Rig.draw(c, a.skin, a.skel, pose, x, y, { flip, tint: col, upright: up }), 0.25, '#8fd3ff');
    }
    const hurt = Game.mode === 'battle' && Battle.ps.hurt > 0 && Math.floor(this.t * 20) % 2 === 0;
    Pix.shadow(ctx, x, y, 12);
    a.draw(ctx, x, y, { flip, tint: hurt ? '#ffffff' : null });
  },
  /* Кончик оружия героя в мировых координатах (сфера посоха, остриё меча). */
  tip(x, y) { const p = Game.player; return p.actor.tip('weapon', -(p.cls.tipLen || 24), x, y, p.face < 0); },
};
