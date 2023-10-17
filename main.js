import "./style.css";
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
import { io } from 'socket.io-client'

const videoElement = document.querySelector("#video");
const canvasElement = document.querySelector("#canvas");
const canvasCtx = canvas.getContext("2d");
const gestureOutput = document.querySelector("#output");
const activeMirrorMode = document.querySelector("#activeMirrorMode");
const detectedText = document.querySelector("#detectedText");
const translatedText = document.querySelector("#translatedText");
let isMirrorMode = true;
let webcamRunning = false;
let landmarkXYZ = [];
let landmarkPushIdx = 0
const passLandmarkToServerUnit = 50;
const SERVER_URL = 'http://127.0.0.1:5050'

const socket = io(SERVER_URL)
socket.on('connect', () => {
  console.log(socket.connected)
})

socket.on('detect', (res) => {
  console.log('detect', res)
})

function onResults(results) {
  // const data = tf.tensor2d([processedLandmarks]);

  document.body.classList.add("loaded");

  if (
    results.leftHandLandmarks?.length > 0 ||
    results.rightHandLandmarks?.length > 0
  ) {
    // landmarkXYZ.push({leftHandLandmarks: results.leftHandLandmarks, rightHandLandmarks: results.rightHandLandmarks})

    socket.emit('landmark', {data: results})
   // if(landmarkPushIdx % passLandmarkToServerUnit === 0) {
   //    // console.log(landmarkXYZ)
   //    socket.emit('landmark', {data: landmarkXYZ})
   //    landmarkXYZ = [];
   //  }
  }


  landmarkPushIdx += 1;

  // draw
  drawHolisticLandmarks(results);
}

function dtwDistance(sequence1, sequence2) {
  // Create a distance matrix.
  const distanceMatrix = [[]];

  // Initialize the distance matrix.
  for (let i = 0; i < sequence1.length; i++) {
    distanceMatrix[i] = [[]];
    for (let j = 0; j < sequence2.length; j++) {
      distanceMatrix[i][j] = Infinity;
    }
  }

  // Calculate the distance matrix.
  distanceMatrix[0][0] = 0;
  for (let i = 1; i < sequence1.length; i++) {
    distanceMatrix[i][0] =
      distanceMatrix[i - 1][0] + Math.abs(sequence1[i] - sequence2[0]);
  }
  for (let j = 1; j < sequence2.length; j++) {
    distanceMatrix[0][j] =
      distanceMatrix[0][j - 1] + Math.abs(sequence1[0] - sequence2[j]);
  }

  for (let i = 1; i < sequence1.length; i++) {
    for (let j = 1; j < sequence2.length; j++) {
      distanceMatrix[i][j] = Math.min(
        distanceMatrix[i - 1][j] + Math.abs(sequence1[i] - sequence2[j]),
        distanceMatrix[i][j - 1] + Math.abs(sequence1[i] - sequence2[j]),
        distanceMatrix[i - 1][j - 1] + Math.abs(sequence1[i] - sequence2[j])
      );
    }
  }

  // Return the distance between the last two points in the sequences.
  return distanceMatrix[sequence1.length - 1][sequence2.length - 1];
}

function createFeatureVectorFromLandmarks(landmarks) {
  // Extract the positions of the landmarks.
  const positions = landmarks.map((landmark) => landmark.position);

  // Calculate the distances between the landmarks.
  const distances = [];
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      distances.push(
        Math.sqrt(
          Math.pow(positions[i].x - positions[j].x, 2) +
            Math.pow(positions[i].y - positions[j].y, 2)
        )
      );
    }
  }

  // Calculate the angles between the landmarks.
  const angles = [];
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      angles.push(
        Math.atan2(
          positions[j].y - positions[i].y,
          positions[j].x - positions[i].x
        )
      );
    }
  }

  // Return the feature vector.
  return [...positions, ...distances, ...angles];
}

function drawHolisticLandmarks(results) {
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

  canvasCtx.drawImage(
    results.image,
    0,
    0,
    canvasElement.width,
    canvasElement.height
  );
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
  selfieMode: true,
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
    canvasElement.width = videoElement.getBoundingClientRect().width;
    canvasElement.height = videoElement.getBoundingClientRect().height;
    await holistic.send({ image: videoElement });
  },
});

camera.start();
