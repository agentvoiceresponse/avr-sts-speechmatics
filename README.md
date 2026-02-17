# Agent Voice Response - Speechmatics STS Service

[![Discord](https://img.shields.io/discord/1347239846632226998?label=Discord&logo=discord)](https://discord.gg/DFTU69Hg74)
[![GitHub Repo stars](https://img.shields.io/github/stars/agentvoiceresponse/avr-sts-speechmatics?style=social)](https://github.com/agentvoiceresponse/avr-sts-speechmatics)
[![Docker Pulls](https://img.shields.io/docker/pulls/agentvoiceresponse/avr-sts-speechmatics?label=Docker%20Pulls&logo=docker)](https://hub.docker.com/r/agentvoiceresponse/avr-sts-speechmatics)
[![Ko-fi](https://img.shields.io/badge/Support%20us%20on-Ko--fi-ff5e5b.svg)](https://ko-fi.com/agentvoiceresponse)

This service connects AVR to the Speechmatics Flow API over WebSocket.
It receives audio chunks from `avr-core`, forwards them to Speechmatics, and streams generated audio back in near real-time.

## Prerequisites

- Node.js 18+ and npm
- A valid Speechmatics API key with Flow access

## Setup

### 1) Clone the repository

```bash
git clone https://github.com/agentvoiceresponse/avr-sts-speechmatics.git
cd avr-sts-speechmatics
```

### 2) Install dependencies

```bash
npm install
```

### 3) Configure environment variables

Copy `.env.example` to `.env` and set your values:

```bash
PORT=6040
SPEECHMATICS_API_KEY=your_speechmatics_api_key_here
SPEECHMATICS_REGION=eu
```

Required:

- `SPEECHMATICS_API_KEY`: Speechmatics API key

Optional:

- `PORT`: Local WebSocket server port (default: `6040`)
- `SPEECHMATICS_REGION`: JWT region used by Speechmatics auth (default: `eu`)

### 4) Run the service

```bash
npm start
```

## Runtime behavior

- Transport: WebSocket
- Input audio expected from AVR: base64-encoded PCM s16le, 8 kHz
- Output audio sent to AVR: base64-encoded PCM s16le, 8 kHz
- Frame pacing: 20 ms frames (`160` samples at `8000` Hz)

## Client message protocol

Incoming messages from AVR:

```json
{ "type": "init", "uuid": "call-uuid" }
{ "type": "audio", "audio": "<base64_pcm_chunk>" }
```

Outgoing messages to AVR:

```json
{ "type": "audio", "audio": "<base64_pcm_chunk>" }
{ "type": "error", "message": "..." }
```

## Scripts

- `npm start`: run service
- `npm run start:dev`: run with nodemon and inspector
- `npm run dc:build`: build Docker image
- `npm run dc:push`: push Docker image

## Support and community

- GitHub: [https://github.com/agentvoiceresponse](https://github.com/agentvoiceresponse)
- Discord: [https://discord.gg/DFTU69Hg74](https://discord.gg/DFTU69Hg74)
- Docker Hub: [https://hub.docker.com/u/agentvoiceresponse](https://hub.docker.com/u/agentvoiceresponse)
- NPM: [https://www.npmjs.com/~agentvoiceresponse](https://www.npmjs.com/~agentvoiceresponse)
- Wiki: [https://wiki.agentvoiceresponse.com/en/home](https://wiki.agentvoiceresponse.com/en/home)

## Support AVR

AVR is free and open-source.
Donations are optional and do not unlock extra features or services.

<a href="https://ko-fi.com/agentvoiceresponse" target="_blank"><img src="https://ko-fi.com/img/githubbutton_sm.svg" alt="Support us on Ko-fi"></a>

## License

MIT License - see [LICENSE.md](LICENSE.md).
