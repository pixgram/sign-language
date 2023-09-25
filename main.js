import "./style.css";
import {
  GestureRecognizer,
  FilesetResolver,
  DrawingUtils,
} from "@mediapipe/tasks-vision";

let gestureRecognizer = null;
const runningMode = "VIDEO";

const createGestureRecognizer = async () => {
  const vision = await FilesetResolver.forVisionTasks("wasm");

  gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: "/data/models/gesture_recognizer.task",
      delegate: "GPU",
    },
    runningMode: runningMode,
    numHands: 2,
  });
};
createGestureRecognizer();

const video = document.querySelector("#video");
const canvas = document.querySelector("#canvas");
const ctx = canvas.getContext("2d");
const gestureOutput = document.querySelector("#output");
const activeMirrorMode = document.querySelector("#activeMirrorMode");
const detectedText = document.querySelector("#detectedText");
const translatedText = document.querySelector("#translatedText");
let isMirrorMode = true;
let webcamRunning = false;

activeMirrorMode.addEventListener("change", (e) => {
  isMirrorMode = e.target.checked;

  if (isMirrorMode) {
    onMirrorMode();
  } else {
    offMirrorMode();
  }
});

const onMirrorMode = () => {
  video.style.transform = "rotateY(180deg)";
  canvas.style.transform = "rotateY(180deg)";
};

const offMirrorMode = () => {
  video.removeAttribute("style");
  canvas.removeAttribute("style");
};

// Check if webcam access is supported.
function hasGetUserMedia() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

if (hasGetUserMedia()) {
  onMirrorMode();
  enableCam();
}

function enableCam() {
  if (webcamRunning === true) {
    webcamRunning = false;
  } else {
    webcamRunning = true;
  }

  // getUsermedia parameters.
  const constraints = {
    video: true,
  };

  // Activate the webcam stream.
  navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
    video.srcObject = stream;
    video.addEventListener("loadeddata", predictWebcam);
  });
}

let lastVideoTime = -1;
let results = undefined;
let lastCategoryName = "";
async function predictWebcam() {
  let nowInMs = Date.now();

  if (video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime;
    results = gestureRecognizer.recognizeForVideo(video, nowInMs);
  }

  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const drawingUtils = new DrawingUtils(ctx);

  if (results.landmarks) {
    for (const landmarks of results.landmarks) {
      drawingUtils.drawConnectors(
        landmarks,
        GestureRecognizer.HAND_CONNECTIONS,
        {
          color: "#00FF00",
          lineWidth: 1,
        }
      );
      drawingUtils.drawLandmarks(landmarks, {
        color: "#FF0000",
        lineWidth: 1,
        radius: 1,
      });
    }
  }

  ctx.restore();

  if (results.gestures.length > 0) {
    gestureOutput.style.display = "block";
    const categoryName = results.gestures[0][0].categoryName;
    const categoryScore = parseFloat(
      results.gestures[0][0].score * 100
    ).toFixed(2);
    const handedness = results.handednesses[0][0].displayName;

    if (categoryName !== "None" && categoryName !== lastCategoryName) {
      translateToText(categoryName);
      lastCategoryName = categoryName;
    }

    // debug panel
    gestureOutput.innerText = `GestureRecognizer: ${categoryName}\n Confidence: ${categoryScore} %\n Handedness: ${handedness}`;
  } else {
    gestureOutput.style.display = "none";
  }
  // Call this function again to keep predicting when the browser is ready.
  if (webcamRunning === true) {
    window.requestAnimationFrame(predictWebcam);
  }
}

function translateToText(word) {
  detectedText.innerText = `${word}`;
}
