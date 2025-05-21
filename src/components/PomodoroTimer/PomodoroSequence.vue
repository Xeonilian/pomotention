<template>
  <div class="pomodoro-container">
    <button class="minimize-button" @click="toggleMinimize">
      {{ isMinimized ? "+" : "-" }}
    </button>

    <div class="status-row">
      <span class="status-label">Let's 🍅!</span>
    </div>

    <div class="progress-container" ref="progressContainer"></div>

    <div class="sequence-row" v-if="!isMinimized">
      <textarea
        v-model="sequenceInput"
        placeholder="🍅+05+🍅+15..."
        class="sequence-input"
      ></textarea>
    </div>

    <div class="hint-text" v-if="!isMinimized">
      🍅=25min work, 05/15/30=break minutes
    </div>

    <div class="button-row" v-if="!isMinimized">
      <button class="action-button" @click="addPomodoro" title="insert 🍅+05">
        🍅
      </button>
      <button class="action-button" @click="addPizza" title="insert 4x(🍅+05)">
        🍕
      </button>
      <button class="action-button" @click="startPomodoro">▶️</button>
      <button class="action-button" @click="stopPomodoro">⏹️</button>
    </div>
  </div>
</template>

<script>
export default {
  name: "PomodoroSequence",
  data() {
    return {
      isMinimized: false,
      sequenceInput: ">>>>🍅+05+🍅+05+🍅+05+🍅+15",
      isRunning: false,
    };
  },
  methods: {
    toggleMinimize() {
      this.isMinimized = !this.isMinimized;
    },
    addPomodoro() {
      if (this.sequenceInput.trim() === "") {
        this.sequenceInput = "🍅+05";
      } else {
        this.sequenceInput += "+🍅+05";
      }
    },
    addPizza() {
      if (this.sequenceInput.trim() === "") {
        this.sequenceInput = "🍅+05+🍅+05+🍅+05+🍅+15";
      } else {
        this.sequenceInput += "+🍅+05+🍅+05+🍅+05+🍅+15";
      }
    },
    startPomodoro() {
      // TODO: 实现开始逻辑
      this.isRunning = true;
    },
    stopPomodoro() {
      // TODO: 实现停止逻辑
      this.isRunning = false;
    },
  },
};
</script>

<style scoped>
.pomodoro-container {
  position: relative;
  background-color: white;
  border: 2px solid grey;
  border-radius: 10px;
  padding: 10px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);
  width: 300px;
}

.minimize-button {
  position: absolute;
  top: 5px;
  right: 5px;
  width: 20px;
  height: 20px;
  line-height: 15px;
  text-align: center;
  padding: 0;
  border-radius: 50%;
}

.status-row {
  display: flex;
  justify-content: center;
  margin-top: 10px;
}

.status-label {
  font-size: 16px;
  color: rgb(35, 39, 43);
  font-weight: bold;
  height: 16px;
}

.progress-container {
  display: flex;
  gap: 2px;
  margin: 0 auto;
  padding: 10px;
  width: 230px;
}

.sequence-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.sequence-input {
  width: 230px;
  height: 100px;
  font-family: "Consolas", "Courier New", Courier, "Lucida Console", Monaco,
    "Consolas", "Liberation Mono", "Menlo", monospace;
  font-size: 14px;
  padding: 5px;
  resize: none;
  display: block;
  margin: 0 auto;
}

.hint-text {
  font-size: 12px;
  color: gray;
  margin-bottom: 10px;
}

.button-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 200px;
  margin: 0 auto;
}

.action-button {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 20%;
  cursor: pointer;
}

@keyframes progress-animation {
  from {
    background-position: 0 0;
  }
  to {
    background-position: 20px 0;
  }
}
</style>
