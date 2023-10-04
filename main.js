import "./style.css";
import DeviceDetector from "device-detector-js";
import {
  Holistic,
  POSE_CONNECTIONS,
  HAND_CONNECTIONS,
  POSE_LANDMARKS_LEFT,
  POSE_LANDMARKS_RIGHT,
  FACEMESH_TESSELATION,
  FACEMESH_RIGHT_EYE,
  FACEMESH_RIGHT_EYEBROW,
  FACEMESH_LEFT_EYE,
  FACEMESH_LEFT_EYEBROW,
  FACEMESH_FACE_OVAL,
  FACEMESH_LIPS,
} from "@mediapipe/holistic";
import { drawConnectors, drawLandmarks, lerp } from "@mediapipe/drawing_utils";
import { Camera } from "@mediapipe/camera_utils";

const videoElement = document.querySelector("#video");
const canvasElement = document.querySelector("#canvas");
const canvasCtx = canvas.getContext("2d");
const gestureOutput = document.querySelector("#output");
const activeMirrorMode = document.querySelector("#activeMirrorMode");
const detectedText = document.querySelector("#detectedText");
const translatedText = document.querySelector("#translatedText");
let isMirrorMode = true;
let webcamRunning = false;

function onResults(results) {
  document.body.classList.add("loaded");
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

  canvasCtx.lineWidth = 5;
  // Pose...
  drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {
    color: "white",
    lineWidth: 1,
  });
  drawLandmarks(
    canvasCtx,
    Object.values(POSE_LANDMARKS_LEFT).map(
      (index) => results.poseLandmarks[index]
    ),
    {
      visibilityMin: 0.65,
      color: "white",
      fillColor: "rgb(255,138,0)",
      lineWidth: 1,
      radius: (data) => {
        return lerp(data.from.z, -0.15, 0.1, 2, 1);
      },
    }
  );
  drawLandmarks(
    canvasCtx,
    Object.values(POSE_LANDMARKS_RIGHT).map(
      (index) => results.poseLandmarks[index]
    ),
    {
      visibilityMin: 0.65,
      color: "white",
      fillColor: "rgb(0,217,231)",
      lineWidth: 1,
      radius: (data) => {
        return lerp(data.from.z, -0.15, 0.1, 2, 1);
      },
    }
  );

  // Hands...
  drawConnectors(canvasCtx, results.rightHandLandmarks, HAND_CONNECTIONS, {
    lineWidth: 1,
    color: "white",
  });
  drawLandmarks(canvasCtx, results.rightHandLandmarks, {
    color: "white",
    fillColor: "rgb(0,217,231)",
    lineWidth: 2,
    radius: (data) => {
      return lerp(data.from.z, -0.15, 0.1, 4, 1);
    },
  });
  drawConnectors(canvasCtx, results.leftHandLandmarks, HAND_CONNECTIONS, {
    lineWidth: 1,
    color: "white",
  });
  drawLandmarks(canvasCtx, results.leftHandLandmarks, {
    color: "white",
    fillColor: "rgb(255,138,0)",
    lineWidth: 2,
    radius: (data) => {
      return lerp(data.from.z, -0.15, 0.1, 4, 1);
    },
  });

  // Face...
  drawConnectors(canvasCtx, results.faceLandmarks, FACEMESH_TESSELATION, {
    color: "#C0C0C070",
    lineWidth: 1,
  });
  drawConnectors(canvasCtx, results.faceLandmarks, FACEMESH_RIGHT_EYE, {
    color: "rgb(0,217,231)",
    lineWidth: 0.7,
  });
  drawConnectors(canvasCtx, results.faceLandmarks, FACEMESH_RIGHT_EYEBROW, {
    color: "rgb(0,217,231)",
    lineWidth: 0.7,
  });
  drawConnectors(canvasCtx, results.faceLandmarks, FACEMESH_LEFT_EYE, {
    color: "rgb(255,138,0)",
    lineWidth: 0.7,
  });
  drawConnectors(canvasCtx, results.faceLandmarks, FACEMESH_LEFT_EYEBROW, {
    color: "rgb(255,138,0)",
    lineWidth: 0.7,
  });
  drawConnectors(canvasCtx, results.faceLandmarks, FACEMESH_FACE_OVAL, {
    color: "#E0E0E0",
    lineWidth: 1,
  });
  drawConnectors(canvasCtx, results.faceLandmarks, FACEMESH_LIPS, {
    color: "#E0E0E0",
    lineWidth: 1,
  });

  canvasCtx.restore();
}

const holistic = new Holistic({
  locateFile: (file) => {
    return `/node_modules/@mediapipe/holistic/${file}`;
  },
});

holistic.setOptions({
  // selfieMode: true,
  modelComplexity: 1,
  smoothLandmarks: true,
  enableSegmentation: false,
  smoothSegmentation: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
});
holistic.onResults(onResults);

const camera = new Camera(videoElement, {
  onFrame: async () => {
    await holistic.send({ image: videoElement });
  },
  onResults: () => {},
  width: 300,
  height: 300,
});

camera.start();

// import {
//   GestureRecognizer,
//   FilesetResolver,
//   DrawingUtils,
// } from "@mediapipe/tasks-vision";

// let gestureRecognizer = null;
// const runningMode = "VIDEO";

// const createGestureRecognizer = async () => {
//   const vision = await FilesetResolver.forVisionTasks("wasm");

//   gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
//     baseOptions: {
//       modelAssetPath: "/data/models/gesture_recognizer.task",
//       delegate: "GPU",
//     },
//     runningMode: runningMode,
//     numHands: 2,
//   });
// };
// createGestureRecognizer();

// activeMirrorMode.addEventListener("change", (e) => {
//   isMirrorMode = e.target.checked;

//   if (isMirrorMode) {
//     onMirrorMode();
//   } else {
//     offMirrorMode();
//   }
// });

// const onMirrorMode = () => {
//   video.style.transform = "rotateY(180deg)";
//   canvas.style.transform = "rotateY(180deg)";
// };

// const offMirrorMode = () => {
//   video.removeAttribute("style");
//   canvas.removeAttribute("style");
// };

// // Check if webcam access is supported.
// function hasGetUserMedia() {
//   return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
// }

// if (hasGetUserMedia()) {
//   onMirrorMode();
//   enableCam();
// }

// function enableCam() {
//   if (webcamRunning === true) {
//     webcamRunning = false;
//   } else {
//     webcamRunning = true;
//   }

//   // getUsermedia parameters.
//   const constraints = {
//     video: true,
//   };

//   // Activate the webcam stream.
//   navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
//     video.srcObject = stream;
//     video.addEventListener("loadeddata", predictWebcam);
//   });
// }

// let lastVideoTime = -1;
// let results = undefined;
// let lastCategoryName = "";
// async function predictWebcam() {
//   let nowInMs = Date.now();

//   if (video.currentTime !== lastVideoTime) {
//     lastVideoTime = video.currentTime;
//     results = gestureRecognizer.recognizeForVideo(video, nowInMs);
//   }

//   ctx.save();
//   ctx.clearRect(0, 0, canvas.width, canvas.height);
//   const drawingUtils = new DrawingUtils(ctx);

//   if (results.landmarks) {
//     for (const landmarks of results.landmarks) {
//       drawingUtils.drawConnectors(
//         landmarks,
//         GestureRecognizer.HAND_CONNECTIONS,
//         {
//           color: "#00FF00",
//           lineWidth: 1,
//         }
//       );
//       drawingUtils.drawLandmarks(landmarks, {
//         color: "#FF0000",
//         lineWidth: 1,
//         radius: 1,
//       });
//     }
//   }

//   ctx.restore();

//   if (results.gestures.length > 0) {
//     gestureOutput.style.display = "block";
//     const categoryName = results.gestures[0][0].categoryName;
//     const categoryScore = parseFloat(
//       results.gestures[0][0].score * 100
//     ).toFixed(2);
//     const handedness = results.handednesses[0][0].displayName;

//     if (categoryName !== "None" && categoryName !== lastCategoryName) {
//       signToText(categoryName);
//       lastCategoryName = categoryName;
//     }

//     // debug panel
//     gestureOutput.innerText = `GestureRecognizer: ${categoryName}\n Confidence: ${categoryScore} %\n Handedness: ${handedness}`;
//   } else {
//     gestureOutput.style.display = "none";
//   }
//   // Call this function again to keep predicting when the browser is ready.
//   if (webcamRunning === true) {
//     window.requestAnimationFrame(predictWebcam);
//   }
// }

// function signToText(word) {
//   detectedText.innerText = `${word}`;
// }
