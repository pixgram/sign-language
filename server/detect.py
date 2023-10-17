from flask import Flask, render_template
from flask_socketio import SocketIO, send, emit
from flask_cors import CORS

app = Flask(__name__, template_folder='./server')
app.config["DEBUG"] = 1
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")


@app.route('/')
def signs():
    return {"test": '123333'}

@socketio.on('landmark')
def landmark(data):
    print(data)
    # emit('detect', data, broadcast=True)


if __name__ == '__main__':
    # app.run()
    socketio.run(app, host='127.0.0.1', port=5050)
