import "./style.css";
import DeviceDetector from "device-detector-js";
import {
  Holistic,
  POSE_CONNECTIONS,
  FACEMESH_TESSELATION,
  HAND_CONNECTIONS,
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
  const radiusLerp = (data) => {
    return lerp(data.from.z, 3, 0.7, 10, 1);
  };
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  // canvasCtx.drawImage(
  //   results.segmentationMask,
  //   0,
  //   0,
  //   canvasElement.width,
  //   canvasElement.height
  // );

  // Only overwrite existing pixels.
  canvasCtx.globalCompositeOperation = "source-in";
  canvasCtx.fillStyle = "#00FF00";
  canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);

  // Only overwrite missing pixels.
  canvasCtx.globalCompositeOperation = "destination-atop";
  // canvasCtx.drawImage(
  //   results.image,
  //   0,
  //   0,
  //   canvasElement.width,
  //   canvasElement.height
  // );

  canvasCtx.globalCompositeOperation = "source-over";
  drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {
    color: "#00FF00",
    lineWidth: 1,
    radius: (data) => {
      return radiusLerp(data);
    },
  });
  drawLandmarks(canvasCtx, results.poseLandmarks, {
    color: "#FF0000",
    lineWidth: 1,
    radius: (data) => {
      return radiusLerp(data);
    },
  });

  drawConnectors(canvasCtx, results.faceLandmarks, FACEMESH_TESSELATION, {
    color: "#C0C0C070",
    lineWidth: 0.5,
  });

  drawConnectors(canvasCtx, results.leftHandLandmarks, HAND_CONNECTIONS, {
    color: "#00CC00",
    lineWidth: 2,
  });
  drawLandmarks(canvasCtx, results.leftHandLandmarks, {
    color: "#FF0000",
    lineWidth: 2,
    radius: (data) => {
      return radiusLerp(data);
    },
  });

  drawConnectors(canvasCtx, results.rightHandLandmarks, HAND_CONNECTIONS, {
    color: "#00CC00",
    lineWidth: 2,
  });
  drawLandmarks(canvasCtx, results.rightHandLandmarks, {
    color: "#FF0000",
    lineWidth: 2,
    radius: (data) => {
      return radiusLerp(data);
    },
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
  enableSegmentation: true,
  smoothSegmentation: true,
  refineFaceLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
});
holistic.onResults(onResults);

const camera = new Camera(videoElement, {
  onFrame: async () => {
    await holistic.send({ image: videoElement });
  },
  width: videoElement.width,
  height: videoElement.height,
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
