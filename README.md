# MovieMeet - Watch Movies Together

A collaborative movie watching platform that allows users to watch movies together in synchronized rooms with video chat and text chat capabilities.

## Features

- 🎬 Synchronized movie watching experience
- 💬 Live text chat during movie playback
- 📹 Video chat with friends while watching 
- 🔄 Seamless playback control across all viewers
- 🚀 Real-time communication via WebSockets

## Technology Stack

- **Frontend**: React, TypeScript, TailwindCSS, Vite
- **Backend**: Node.js, Express, Socket.io
- **Database**: Firebase Realtime Database
- **Video Chat**: LiveKit
- **Authentication**: Firebase Auth
- **Hosting**: Firebase Hosting

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v14 or later)
- npm or yarn
- A Firebase account
- ngrok (for local development with external access)

## Setup and Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/movie-meet.git
   cd movie-meet
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Firebase**
   - Create a new Firebase project
   - Enable Realtime Database
   - Enable Authentication
   - Add a web app to your Firebase project
   - Copy your Firebase configuration

4. **Create environment variables**
   - Create a `.env.local` file in the root directory for development
   - Create a `.env.production` file for production
   - Add your Firebase configuration:
     ```
     VITE_FIREBASE_API_KEY=your-api-key
     VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain
     VITE_FIREBASE_PROJECT_ID=your-project-id
     VITE_FIREBASE_STORAGE_BUCKET=your-storage-bucket
     VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
     VITE_FIREBASE_APP_ID=your-app-id
     VITE_LIVEKIT_URL=your-livekit-server-url
     VITE_SOCKET_URL=your-socket-server-url
     ```

5. **Start the development server**
   ```bash
   # Start the frontend
   npm run dev
   
   # Start the backend (in another terminal)
   cd server
   npm run dev
   ```

6. **For external access (optional)**
   ```bash
   # Use ngrok to expose your local server
   ngrok http 3001 --host-header="localhost:3001"
   ```

## Usage

### Watching Movies Together
1. From the homepage, click "Join Room"
2. Enter your name and a room ID (create a new one or join an existing one)
3. Share the room ID with friends
4. Upload a movie or paste a URL to start watching together
5. Chat with your friends while watching the movie in sync

## Realtime Communication

MovieMeet uses Socket.io for real-time communication, providing:

1. **Synchronized Playback**: When one user pauses, plays, or seeks in the video, all other users in the room see the same action.

2. **Live Chat**: Text chat with other viewers in real-time.

3. **User Presence**: See who's in the room and get notifications when people join or leave.

4. **Reliable Connection**: The application maintains connections even in challenging network conditions with automatic reconnection.

## LiveKit Integration

The video chat functionality uses LiveKit:

1. **Video and Audio Chat**: See and hear your friends while watching movies together.

2. **Device Selection**: Choose your preferred camera and microphone.

3. **Video Controls**: Toggle your camera and microphone on/off easily.

To configure LiveKit:

1. Set up a LiveKit server or use LiveKit Cloud
2. Add your LiveKit API credentials to the server's environment variables:
   ```
   LIVEKIT_API_KEY=your_api_key
   LIVEKIT_API_SECRET=your_api_secret
   ```

## Deployment

### Frontend Deployment with Firebase Hosting
```bash
# Build the frontend
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

### Backend Deployment
The backend can be deployed to any Node.js hosting service (Heroku, DigitalOcean, etc.) or run on your own server.

For local hosting with external access, use ngrok:
```bash
# Start your server
cd server && npm run dev

# In another terminal, start ngrok
ngrok http 3001 --host-header="localhost:3001"
```

After getting the ngrok URL, update your `.env.production` file with:
```
VITE_SOCKET_URL=https://your-ngrok-url
```

Then rebuild and redeploy the frontend.

## License

[MIT License](LICENSE)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request 