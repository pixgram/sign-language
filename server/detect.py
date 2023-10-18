from flask import Flask
from flask_socketio import SocketIO, send, emit
from flask_cors import CORS
import cv2
import mediapipe as mp
import numpy as np
import tensorflow as tf

app = Flask(__name__, template_folder='./server')
app.config["DEBUG"] = 1
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

actions = ['come', 'away', 'spin']
seq_length = 30

model = tf.keras.models.load_model('data/models/model2_1.0.h5')

# MediaPipe hans model
mp_hands = mp.solutions.hands
hands = mp_hands.Hands()

seq = []
action_seq = []


@app.route('/')
def signs():
    return {"status": 'ready'}


@socketio.on('landmark')
def landmark(data):
    predict(data)
    # print(data)


def predict(landmarks_data):
    # print(landmarks_data)
    if landmarks_data is not None:
        for hand_landmarks in landmarks_data:
            joint = np.zeros((21, 4))
            for j, lm in enumerate(landmarks_data[hand_landmarks]):
                joint[j] = [lm['x'], lm['y'], lm['z'], 1.0]

            # Compute angles between joints
            v1 = joint[[0, 1, 2, 3, 0, 5, 6, 7, 0, 9, 10, 11, 0, 13, 14, 15, 0, 17, 18, 19], :3]  # Parent joint
            v2 = joint[[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], :3]  # Child joint
            v = v2 - v1  # [20, 3]

            # Normalize v
            v = v / np.linalg.norm(v, axis=1)[:, np.newaxis]

            # Get angle using arcos of dot product
            angle = np.arccos(np.einsum('nt,nt->n',
                                        v[[0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14, 16, 17, 18], :],
                                        v[[1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15, 17, 18, 19], :]))  # [15,]

            angle = np.degrees(angle)  # Convert radian to degree

            d = np.concatenate([joint.flatten(), angle])

            seq.append(d)

            if len(seq) < seq_length:
                continue

            input_data = np.expand_dims(np.array(seq[-seq_length:], dtype=np.float32), axis=0)
            y_pred = model.predict(input_data).squeeze()

            i_pred = int(np.argmax(y_pred))
            conf = y_pred[i_pred]

            if conf < 0.9:
                continue

            action = actions[i_pred]
            action_seq.append(action)

            if len(action_seq) < 3:
                continue

            this_action = '?'
            if action_seq[-1] == action_seq[-2] == action_seq[-3]:
                this_action = action
                print(f'checked---->> {this_action}')
                emit('detect', this_action)
                break


if __name__ == '__main__':
    # app.run()
    socketio.run(app, host='127.0.0.1', port=5050)
