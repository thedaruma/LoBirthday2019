export const makeTextScaleUp = (target, duration: number, scene: Phaser.Scene, onComplete?: Function) => {
  return scene.add.tween({
    targets: [target],
    ease: 'Back.easeOut',
    duration: duration,
    delay: 0,
    paused: true,
    alpha: {
      getStart: () => 0,
      getEnd: () => 1
    },
    y:'-=20',
    scaleX: 1,
    scaleY: 1,
    onComplete: () => {
      onComplete ? onComplete() : null;
    }
  })
}