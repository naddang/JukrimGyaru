const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'game-container',
  physics: {
      default: 'arcade',
      arcade: {
          debug: false,
      },
  },
  scene: {
      preload,
      create,
      update,
  },
  backgroundColor: '#3498db',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
}
};

const game = new Phaser.Game(config);

let player;
let bullets;
let score = 0;
let lastUpdateTime = 0;
let scoreText;
let cursors;
let circleCenter;
let circleRadius;
let isGameOver = false;
let delay = 1000;
let touchX = null;
let touchY = null;
let playerSpeed = 400;
let isTouching = false;
let bgm;

function preload() {
  this.load.spritesheet('player', './assets/images/character/motaku.png', { frameWidth: 32, frameHeight: 32 }); // 플레이어 이미지
  this.load.spritesheet('moyaji', './assets/images/character/moyaji.png', { frameWidth: 60, frameHeight: 60 });   // 화살 이미지
  this.load.audio('bgm', './assets/audios/bgm/moyaji-kaju.mp3');   // BGM
}

function create() {
  // 원형 필드 (참고용)
  this.add.circle(400, 300, 250, 0x6666ff, 0.2);

  // 원의 중심과 반지름
  circleCenter = { x: 400, y: 300 };
  circleRadius = 220;

  // 플레이어 생성
  player = this.physics.add.sprite(400, 300, 'player').setCollideWorldBounds(true);
  player.setScale(1);

  // 애니메이션 정의
  this.anims.create({
      key: 'walk',
      frames: this.anims.generateFrameNumbers('player', { start: 0, end: 3 }),
      frameRate: 10,
      repeat: -1
  });

  // 애니메이션 정의
  this.anims.create({
      key: 'roll',
      frames: this.anims.generateFrameNumbers('moyaji', { start: 0, end: 15 }),
      frameRate: 30,
      repeat: -1
  });

  // 화살 그룹
  bullets = this.physics.add.group();

  // 화살과 플레이어 충돌 처리
  this.physics.add.overlap(player, bullets, hitBullet, null, this);

  // 점수 표시
  scoreText = this.add.text(10, 10, 'Score: 0', { fontSize: '20px', fill: '#fff' });

  // 화살 생성 루프
  this.time.addEvent({
      delay: delay, // 1초마다 화살 생성
      callback: spawnBullet,
      callbackScope: this,
      loop: !isGameOver,
  });

  // 10초마다 화살이 하나씩 추가로 생성되도록 설정
  setInterval(() => {
      delay -= 50
      this.time.addEvent({
          delay: delay, // 1초마다 화살 생성
          callback: spawnBullet,
          callbackScope: this,
          loop: !isGameOver,
      });
  }, 5000);

  // 입력 처리
  cursors = this.input.keyboard.createCursorKeys();

  // 터치 입력 처리
  this.input.on('pointerdown', (pointer) => {
    if (pointer.isDown) {
      isTouching = true;
      touchX = pointer.x;
      touchY = pointer.y;
    }
  });

  this.input.on('pointermove', (pointer) => {
    if (isTouching && pointer.isDown) {
      touchX = pointer.x;
      touchY = pointer.y;
    }
  });

  this.input.on('pointerup', (pointer) => {
    if (!pointer.isDown) {
      isTouching = false;
      touchX = null;
      touchY = null;
    }
  });

  // 리트라이 버튼 클릭 이벤트
  document.getElementById('retry-button').addEventListener('click', () => {
    location.reload();
  });

  // BGM 재생
  bgm = this.sound.add('bgm', { loop: true, volume: 0.5 });
  bgm.play();
}

function update(time, delta) {
  if (isGameOver) {
      return;
  }

  player.anims.play('walk', true);
  bullets.children.iterate(function (bullet) {
      bullet.anims.play('roll', true);
  });

  // 총알의 움직임을 업데이트
  bullets.children.iterate(function (bullet) {
      if (bullet) {
          // 총알이 화면 밖으로 나가면 제거
          if (bullet.x < 0 || bullet.x > 800 || bullet.y < 0 || bullet.y > 600) {
              bullet.destroy();
          }
      }
  });

  if (cursors.left.isDown) {
      player.setVelocityX(-playerSpeed);
  } else if (cursors.right.isDown) {
      player.setVelocityX(playerSpeed);
  } else {
      player.setVelocityX(0);
  }

  if (cursors.up.isDown) {
      player.setVelocityY(-playerSpeed);
  } else if (cursors.down.isDown) {
      player.setVelocityY(playerSpeed);
  } else {
      player.setVelocityY(0);
  }

  // 플레이어가 원 밖으로 나가지 않도록 제한
  const dx = player.x - circleCenter.x;
  const dy = player.y - circleCenter.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance > circleRadius) {
      const angle = Math.atan2(dy, dx);
      player.x = circleCenter.x + circleRadius * Math.cos(angle);
      player.y = circleCenter.y + circleRadius * Math.sin(angle);
  }

  // 점수 증가 로직
  if (time - lastUpdateTime >= 10) { // 0.01초마다 점수 증가
      score += 1;
      scoreText.setText('Score: ' + score);
      lastUpdateTime = time;
  }

  // 터치 입력에 따른 플레이어 이동
  if (touchX !== null && touchY !== null) {
    const deltaX = touchX - player.x;
    const deltaY = touchY - player.y;
    const angle = Math.atan2(deltaY, deltaX);
    player.setVelocityX(Math.cos(angle) * playerSpeed);
    player.setVelocityY(Math.sin(angle) * playerSpeed);
  }
}

// 터치 입력에 따른 플레이어 이동 함수
function movePlayer(pointer) {
  touchX = pointer.x;
  touchY = pointer.y;
}

function spawnBullet() {
  if (isGameOver) {
      return;
  }

  // 원 바깥에서 총알 생성
  const angle = Phaser.Math.Between(0, 360);
  const x = circleCenter.x + Math.cos(Phaser.Math.DegToRad(angle)) * (circleRadius + 50);
  const y = circleCenter.y + Math.sin(Phaser.Math.DegToRad(angle)) * (circleRadius + 50);

  const bullet = bullets.create(x, y, 'moyaji');
  bullet.setScale(0.5); // 총알 크기 조정

  // 총알 히트박스 크기 (60 x 60)
  const hitboxWidth = 60 * bullet.scaleX;
  const hitboxHeight = 60 * bullet.scaleY;

  // 히트박스 초기화
  bullet.body.setSize(hitboxWidth, hitboxHeight);

  // 플레이어를 향한 속도로 총알 이동
  const targetAngle = Phaser.Math.Angle.Between(x, y, player.x, player.y);
  const velocity = this.physics.velocityFromRotation(targetAngle, 300); // 속도 조정
  bullet.setVelocity(velocity.x, velocity.y);

  // 총알의 방향을 플레이어를 향하게 설정 (90도 추가)
  bullet.rotation = targetAngle + Phaser.Math.DegToRad(90);
}

function hitBullet(player, arrow) {
  if (isGameOver) {
    return;
  }
  // 게임 오버 처리
  this.physics.pause();
  player.anims.stop();
  bullets.children.iterate(function (bullet) {
    bullet.anims.stop();
  });
  player.setTint(0xff0000);
  isGameOver = true;

  // 게임 오버 메시지 표시
  document.getElementById('score-text').innerText = 'Score: ' + score;
  document.getElementById('game-over').style.display = 'block';
}

// 창 크기 변경에 따라 캔버스 크기 조정
window.addEventListener('resize', () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
});