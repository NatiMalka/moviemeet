# MovieMeet WebSocket Server

This is the WebSocket server for MovieMeet, responsible for real-time features such as video synchronization and chat.

## Features

- Room management (create, join, leave)
- Real-time chat messaging
- Video playback synchronization
- User presence (join/leave notifications)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file based on the example:

```
PORT=3001
CLIENT_URL=http://localhost:5173
```

## Running the Server

For development:

```bash
npm run dev
```

For production:

```bash
npm start
```

## API

The server provides the following WebSocket events:

### Client to Server

- `join_room`: Join a movie watching room
- `leave_room`: Leave the current room
- `video_state_update`: Update video playback state (time, playing/paused)
- `chat_message`: Send a chat message

### Server to Client

- `user_joined`: Notification when a user joins
- `user_left`: Notification when a user leaves
- `room_users`: List of current users and video state when joining
- `video_state_update`: Receive video state updates from other users
- `chat_message`: Receive chat messages

## LiveKit Integration

The server includes a LiveKit token generation endpoint for video chat functionality. To configure LiveKit:

1. Sign up for a LiveKit account at [https://livekit.io/](https://livekit.io/)
2. Create a new project and get your API key and secret
3. Update your `.env` file with:

```
LIVEKIT_API_KEY=your_api_key_here
LIVEKIT_API_SECRET=your_api_secret_here
LIVEKIT_WS_URL=wss://your-livekit-server.com
```

### Token Generation API

**Endpoint:** POST `/generate-token`

**Request Body:**
```json
{
  "roomId": "movie-room-123",
  "username": "User123"
}
```

**Success Response:**
```json
{
  "token": "your_livekit_jwt_token"
}
```

**Error Response:**
```json
{
  "error": "Error message"
}
```

Without LiveKit credentials, the application will fall back to using a demo token generator, which may have rate limits and connection restrictions. 