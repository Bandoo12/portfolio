// ---- Sprite sheet source ----
// hero_run_4x2.png is a 4x2 grid of 4096x4096 frames (16384x8192 total),
// order: frames 0-3 top row (left->right), frames 4-7 bottom row (left->right).
// To swap in a different sheet: update SPRITE_PATH, FRAME_WIDTH/FRAME_HEIGHT
// to match its per-frame size, and FRAME_COUNT + FRAME_TICKS if it doesn't
// have 8 frames.
const SPRITE_PATH = 'assets/hero_run_4x2.png';
const FRAME_WIDTH = 4096;
const FRAME_HEIGHT = 4096;
const FRAME_COUNT = 8;

// ---- Timing ----
// Base playback rate. 1 tick = 1/BASE_FPS seconds.
const BASE_FPS = 30;
const TICK_MS = 1000 / BASE_FPS;
// Per-frame hold length in ticks: contact/recoil frames (0,1,4,5) sit for
// 2 ticks, the airborne in-between frames (2,3,6,7) pass in 1 tick.
const FRAME_TICKS = [2, 2, 1, 1, 2, 2, 1, 1];
// Crossfade length between adjacent frames.
const CROSSFADE_MS = 60;

// ---- Display tuning ----
// Sprite is drawn at DISPLAY_HEIGHT px tall on screen (scale is derived from
// this so it stays correct if FRAME_HEIGHT above ever changes).
const DISPLAY_HEIGHT = 320;

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: 1280,
  height: 720,
  backgroundColor: '#000000',
  scale: {
    // Fits the 1280x720 design into the browser window without stretching.
    // Switch to Phaser.Scale.NONE for an exact, unscaled 1280x720 canvas.
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: { preload, create, update },
};

new Phaser.Game(config);

function preload() {
  this.load.spritesheet('hero', SPRITE_PATH, {
    frameWidth: FRAME_WIDTH,
    frameHeight: FRAME_HEIGHT,
  });
}

function create() {
  const scale = DISPLAY_HEIGHT / FRAME_HEIGHT;
  const x = this.scale.width / 2;
  const groundY = this.scale.height - 20; // "ground" line near bottom of screen

  // Base sprite: plays the real animation and is always fully opaque.
  const hero = this.add.sprite(x, groundY, 'hero');
  hero.setOrigin(0.5, 1.0);
  hero.setScale(scale);

  // Overlay sprite: sits on top of `hero`, always showing the *next* frame
  // ahead of time, fading in (alpha 0 -> 1) over CROSSFADE_MS. Once `hero`
  // itself steps onto that frame the two look identical, masking the hard
  // cut underneath with a short dissolve.
  const heroNext = this.add.sprite(x, groundY, 'hero');
  heroNext.setOrigin(0.5, 1.0);
  heroNext.setScale(scale);
  heroNext.setAlpha(0);

  const frames = [];
  for (let i = 0; i < FRAME_COUNT; i++) {
    frames.push({ key: 'hero', frame: i, duration: FRAME_TICKS[i] * TICK_MS });
  }

  this.anims.create({
    key: 'run',
    frames,
    frameRate: BASE_FPS,
    repeat: -1,
  });

  const startCrossfade = (nextFrameIndex) => {
    this.tweens.killTweensOf(heroNext);
    heroNext.setFrame(nextFrameIndex);
    heroNext.setAlpha(0);
    this.tweens.add({
      targets: heroNext,
      alpha: 1,
      duration: CROSSFADE_MS,
      ease: 'Linear',
    });
  };

  hero.on(Phaser.Animations.Events.ANIMATION_UPDATE, (_anim, animFrame) => {
    const currentFrame = Number(animFrame.frame.name);
    const nextFrame = (currentFrame + 1) % FRAME_COUNT;
    startCrossfade(nextFrame);
  });

  hero.play('run');
  startCrossfade(1); // prime the overlay for the very first transition

  // Smooth playback speed: nudge timeScale toward targetTimeScale instead of
  // snapping. Change this.targetTimeScale at runtime (e.g. from input) to
  // ease the run speed up or down.
  this.hero = hero;
  this.heroNext = heroNext;
  this.targetTimeScale = 1;
}

function update() {
  this.hero.anims.timeScale = Phaser.Math.Linear(
    this.hero.anims.timeScale,
    this.targetTimeScale,
    0.1
  );
}
