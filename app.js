const socket = new WebSocket("wss://52.67.79.21:3000");

const messagesContainer = document.getElementById('message-box');
const input = document.getElementById("messageInput");
const som = document.getElementById("notificacao");
const peers = {};
const channels = {};
let myId = null;

async function createPeerConnection(peerId) {

    const pc = new RTCPeerConnection({
        iceServers: [
            {
                urls: "stun:stun.l.google.com:19302"
            }
        ]
    });

    peers[peerId] = pc;

    pc.onicecandidate = (event) => {

        if (event.candidate) {

            socket.send(JSON.stringify({
                type: "candidate",
                target: peerId,
                candidate: event.candidate
            }));

        }

    };

    pc.ondatachannel = (event) => {

        const channel = event.channel;

        channels[peerId] = channel;

        setupDataChannel(channel);

    };

    pc.onconnectionstatechange = () => {

        console.log(peerId, pc.connectionState);

        if (
            pc.connectionState === "disconnected" ||
            pc.connectionState === "failed" ||
            pc.connectionState === "closed"
        ) {

            delete peers[peerId];
            delete channels[peerId];

        }

    };

    return pc;

}

//answer
socket.onmessage = async (event) => {

    const data = JSON.parse(event.data);

    if (data.type === "new-peer") {

        const pc = await createPeerConnection(data.id);

        const channel = pc.createDataChannel("chat");

        channels[data.id] = channel;

        setupDataChannel(channel);

        const offer = await pc.createOffer();

        await pc.setLocalDescription(offer);

        socket.send(JSON.stringify({
            type: "offer",
            target: data.id,
            offer
        }));

    }

    if (data.type === "id") {

        myId = data.id;

        console.log("Meu ID:", myId);

    }

    if (data.type === "offer") {

        const pc = await createPeerConnection(data.from);

        await pc.setRemoteDescription(data.offer);

        const answer = await pc.createAnswer();

        await pc.setLocalDescription(answer);

        socket.send(JSON.stringify({
            type: "answer",
            target: data.from,
            answer
        }));

    }

    if (data.type === "answer") {

        const pc = peers[data.from];

        if (pc) {

            await pc.setRemoteDescription(data.answer);

        }

    }

    if (data.type === "candidate") {

        const pc = peers[data.from];

        if (pc) {

            try {

                await pc.addIceCandidate(data.candidate);

            } catch (err) {

                console.error(err);

            }
        }
    }
};

//enviar mensagem
function sendMessage() {

    if (!input.value.trim()) return;

    let enviado = false;

    Object.values(channels).forEach(channel => {

        if (channel.readyState === "open") {

            channel.send(input.value);

            enviado = true;

        }

    });

    if (!enviado) {

        console.log("Nenhum canal aberto");

        return;

    }

    addMessage(input.value, 'sent');

    input.value = "";

}


function setupDataChannel(channel) {

    channel.onopen = () => {

        console.log("Canal aberto");

    };

    channel.onmessage = (event) => {

        addMessage(event.data, 'received');

    };

    channel.onclose = () => {

        console.log("Canal fechado");

    };

}

function broadcastMessage(message) {

    Object.values(peers).forEach(pc => {

        pc.sctp.transport.dataChannels?.forEach(channel => {

            if (channel.readyState === "open") {

                channel.send(message);

            }

        });

    });

}

//enviar com teclado
input.addEventListener("keydown", (event) => {

    if (event.key === "Enter") {
        sendMessage();
    }

});

function addMessage(msg, type) {

    const agora = new Date();
    const hora = agora.getHours();
    const minuto = agora.getMinutes();
    const minutoF = String(minuto).padStart(2, '0');

    horamsg = `${hora}h${minutoF}`

    if (type == 'sent') {

        const msgDiv = document.createElement('div');
        const time_msgDiv = document.createElement('div');

        msgDiv.classList.add('message', type);
        msgDiv.textContent = msg;

        time_msgDiv.classList.add('msg-time-sent');
        time_msgDiv.textContent = horamsg;
        
        messagesContainer.appendChild(msgDiv);
        messagesContainer.appendChild(time_msgDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    if (type == 'received') {

        som.play();

        const msgDiv = document.createElement('div');
        const time_msgDiv = document.createElement('div');

        msgDiv.classList.add('message', type);
        msgDiv.textContent = msg;

        time_msgDiv.classList.add('msg-time-received');
        time_msgDiv.textContent = horamsg;
        
        messagesContainer.appendChild(msgDiv);
        messagesContainer.appendChild(time_msgDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

    }

}