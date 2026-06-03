<template>
  <div ref="stageRef" class="timer-bg-balls__stage" aria-hidden="true" />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";
import { TIMER_BALL_COUNT, pickRandomBallColor, type TimerBallPalette } from "@/background/balls/config";

const props = defineProps<{
  palette: TimerBallPalette;
}>();

const stageRef = ref<HTMLElement | null>(null);
const ballEls: HTMLDivElement[] = [];
const animations: Animation[] = [];

function clearBalls() {
  animations.splice(0).forEach((anim) => anim.cancel());
  ballEls.splice(0).forEach((el) => el.remove());
}

function styleBall(ball: HTMLDivElement, palette: TimerBallPalette) {
  const scale = Math.random();
  ball.style.background = pickRandomBallColor(palette);
  ball.style.left = `${Math.floor(Math.random() * 100)}%`;
  ball.style.top = `${Math.floor(Math.random() * 100)}%`;
  ball.style.width = `${Math.random()}em`;
  ball.style.height = ball.style.width;
  return scale;
}

function animateBall(ball: HTMLDivElement, index: number, scale: number) {
  const toX = Math.random() * (index % 2 === 0 ? -11 : 11);
  const toY = Math.random() * 12;
  const anim = ball.animate(
    [
      { transform: `scale(${scale}) translate(0, 0)` },
      { transform: `scale(${scale}) translate(${toX}rem, ${toY}rem)` },
    ],
    {
      duration: (Math.random() + 1) * 2000,
      direction: "alternate",
      fill: "both",
      iterations: Infinity,
      easing: "ease-in-out",
    },
  );
  animations.push(anim);
}

function mountBalls() {
  const stage = stageRef.value;
  if (!stage) return;
  clearBalls();

  for (let i = 0; i < TIMER_BALL_COUNT; i++) {
    const ball = document.createElement("div");
    ball.className = "timer-bg-ball";
    const scale = styleBall(ball, props.palette);
    stage.appendChild(ball);
    ballEls.push(ball);
    animateBall(ball, i, scale);
  }
}

function recolorBalls() {
  ballEls.forEach((ball) => {
    ball.style.background = pickRandomBallColor(props.palette);
  });
}

watch(
  () => props.palette,
  () => recolorBalls(),
  { deep: true },
);

onMounted(mountBalls);
onUnmounted(clearBalls);
</script>
