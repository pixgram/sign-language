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
const videoHeight = `360px`;
const videoWidth = `480px`;
let webcamRunning = false;

// Check if webcam access is supported.
function hasGetUserMedia() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

if (hasGetUserMedia()) {
  // enableCam();
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

/**
 * mirror mode
 * video -> <video class="rotate-y-[180]"> // 비디오의 경우 트렌스폼으로 좌우변경
 * canvas -> context.scale(-1, 1) // 캔버스의 경우는 그림을 좌우변경
 */
let lastVideoTime = -1;
let results = undefined;
async function predictWebcam() {
  const webcamElement = document.getElementById("webcam");
  let nowInMs = Date.now();

  if (video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime;
    results = gestureRecognizer.recognizeForVideo(video, nowInMs);
  }

  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const drawingUtils = new DrawingUtils(ctx);

  canvas.style.height = videoHeight;
  video.style.height = videoHeight;
  canvas.style.width = videoWidth;
  video.style.width = videoWidth;

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
        radius: 3,
      });
    }
  }
  ctx.restore();
  if (results.gestures.length > 0) {
    gestureOutput.style.display = "block";
    gestureOutput.style.width = videoWidth;
    const categoryName = results.gestures[0][0].categoryName;
    const categoryScore = parseFloat(
      results.gestures[0][0].score * 100
    ).toFixed(2);
    const handedness = results.handednesses[0][0].displayName;
    gestureOutput.innerText = `GestureRecognizer: ${categoryName}\n Confidence: ${categoryScore} %\n Handedness: ${handedness}`;
  } else {
    gestureOutput.style.display = "none";
  }
  // Call this function again to keep predicting when the browser is ready.
  if (webcamRunning === true) {
    window.requestAnimationFrame(predictWebcam);
  }
}
