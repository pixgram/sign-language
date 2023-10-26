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
let lastWord = '';
const SERVER_URL = 'http://127.0.0.1:5050'

const socket = io(SERVER_URL)
socket.on('connect', () => {
  console.log(socket.connected, 'server is run')
})

socket.on('detect', (res) => {
  showDetectText(res)
})

function showDetectText(res) {
  if(res !== lastWord) {
    detectedText.innerText = res
  }
  // speak(res, {lang: 'en'})
  // speak('안녕하세요')
}

function speak(text, opt) {
  if(typeof SpeechSynthesisUtterance === 'undefined' || typeof window.speechSynthesis === 'undefined') {
    alert('이 브라우져는 음성 합성을 지원하지 않습니다.');
    return
  }

  window.speechSynthesis.cancel(); // 현재 읽고 있다면 초기화

  const prop = opt || {};

  const speechMsg = new SpeechSynthesisUtterance()
  speechMsg.rate = prop.rate || 1; //속도 0.1 ~ 10
  speechMsg.pitch = prop.pitch || 1; // 음높이 0 ~ 2
  speechMsg.lang = prop.lang || 'ko-KR';
  speechMsg.text = text;

  window.speechSynthesis.speak(speechMsg);
}


function onResults(results) {
  document.body.classList.add("loaded");

  if (
    results.leftHandLandmarks?.length > 0 ||
    results.rightHandLandmarks?.length > 0
  ) {
    const multiHandLandmarks = {leftHandLandmarks: results.leftHandLandmarks, rightHandLandmarks: results.rightHandLandmarks}
    socket.emit('landmark', multiHandLandmarks)
  }

  // draw
  drawHolisticLandmarks(results);
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

  if('poseLandmarks' in results) {
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
  }

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

navigator.mediaDevices.getUserMedia({video: true})
    .then(stream => {
      camera.start();
    })
    .catch(e => {
      console.error('비디오 스트림을 가져오는 동안 오류 발생: ', e)
    })

