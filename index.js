/**
 * index.js
 * Entry point for the Speechmatics Speech-to-Speech streaming WebSocket server.
 * This server handles real-time audio streaming between clients and the Speechmatics API,
 * performing necessary audio format conversions and WebSocket communication.
 *
 * Client Protocol:
 * - Send {"type": "init", "uuid": "uuid"} to initialize session
 * - Send {"type": "audio", "audio": "base64_encoded_audio"} to stream audio
 * - Receive {"type": "audio", "audio": "base64_encoded_audio"} for responses
 * - Receive {"type": "error", "message": "error_message"} for errors
 *
 * @author Agent Voice Response <info@agentvoiceresponse.com>
 * @see https://www.agentvoiceresponse.com
 */

const WebSocket = require("ws");
const { createSpeechmaticsJWT } = require("@speechmatics/auth");
const { FlowClient } = require("@speechmatics/flow-client");

require("dotenv").config();

if (!process.env.SPEECHMATICS_API_KEY) {
  throw new Error("SPEECHMATICS_API_KEY is not set");
}

const FRAME_SAMPLES = 160; // 20 ms @ 8 kHz
let ringBuffer = new Int16Array(0);


/**
 * Creates and configures a Speechmatics agent connection.
 *
 * @returns {Object} Configured Speechmatics agent connection
 */
async function createSpeechmaticsJwt() {
  console.log("Creating Speechmatics JWT");
  try {
    return await createSpeechmaticsJWT({
      type: "flow",
      apiKey: process.env.SPEECHMATICS_API_KEY,
      ttl: 60,
      region: process.env.SPEECHMATICS_REGION || "eu"
    });
  } catch (error) {
    console.error("Failed to create Speechmatics JWT:", error);
    throw error;
  }
}

/**
 * Handles incoming client WebSocket connection and manages communication with the Speechmatics API.
 * Implements buffering for audio chunks received before WebSocket connection is established.
 *
 * @param {WebSocket} clientWs - Client WebSocket connection
 */
const handleClientConnection = (clientWs) => {
  console.log("New client WebSocket connection received");
  let sessionUuid = null;
  let flowClient = null;


  // Handle client WebSocket messages
  clientWs.on("message", async (data) => {
    try {
      const message = JSON.parse(data);
      switch (message.type) {
        case "init":
          sessionUuid = message.uuid;
          console.log("Session UUID:", sessionUuid);
          // Initialize Speechmatics connection when client is ready
          initializeSpeechmaticsConnection();
          break;

        case "audio":
          // Handle audio data from client
          if (message.audio && flowClient) {
            const audioBuffer = Buffer.from(message.audio, "base64");
            // PCM audio (either f32 or int16 depending on audio_format defined above) can be sent to the client
            flowClient.sendAudio(audioBuffer);
          }
          break;

        default:
          console.log("Unknown message type from client:", message.type);
          break;
      }
    } catch (error) {
      console.error("Error processing client message:", error);
    }
  });

  const initializeSpeechmaticsConnection = async () => {
    try {
      const jwt = await createSpeechmaticsJwt();
      flowClient = new FlowClient('wss://flow.api.speechmatics.com', { appId: "avr-sts-speechmatics" });
      flowClient.addEventListener("agentAudio", onAgentAudio);
      flowClient.startConversation(jwt, {
        config: {
          template_id: "094671aa-4b53-496d-a4d1-ceea2b9736b9:latest"
        },
        audioFormat: {
          type: 'raw',
          encoding: 'pcm_s16le',
          sample_rate: 8000,
        },
      });
    } catch (error) {
      console.error("Failed to initialize Speechmatics connection:", error);
      clientWs.send(JSON.stringify({
        type: "error",
        message: "Failed to initialize Speechmatics connection",
      }));
      cleanup();
    }
  }

  const onAgentAudio = (event) => {
    // concat
    const merged = new Int16Array(ringBuffer.length + event.data.length);
    merged.set(ringBuffer);
    merged.set(event.data, ringBuffer.length);
  
    let offset = 0;
  
    while (merged.length - offset >= FRAME_SAMPLES) {
      const frame = merged.slice(offset, offset + FRAME_SAMPLES);
      sendToAVR(frame);
      offset += FRAME_SAMPLES;
    }
  
    ringBuffer = merged.slice(offset);
  }
  
  const sendToAVR = (frame) => {
    const buffer = Buffer.from(
      frame.buffer,
      frame.byteOffset,
      frame.byteLength
    );
  
    const base64 = buffer.toString('base64');
  
    // Send audio back to avr-core
    clientWs.send(JSON.stringify({
      type: "audio",
      audio: base64
    }));
  }

  // Handle client WebSocket close
  clientWs.on("close", () => {
    console.log("Client WebSocket connection closed");
    cleanup();
  });

  clientWs.on("error", (err) => {
    console.error("Client WebSocket error:", err);
    cleanup();
  });

  function cleanup() {
    if (flowClient) flowClient.endConversation();
    if (clientWs) clientWs.close();
  }
};

// Start the server
const startServer = () => {
  try {
    // Create WebSocket server
    const PORT = process.env.PORT || 6040;
    const wss = new WebSocket.Server({ port: PORT });

    wss.on("connection", (clientWs) => {
      console.log("New client connected");
      handleClientConnection(clientWs);
    });

    console.log(
      `Speechmatics Speech-to-Speech WebSocket server running on port ${PORT}`
    );
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Start the server
startServer();
