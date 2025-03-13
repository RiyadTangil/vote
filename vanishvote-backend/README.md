# VanishVote Backend

This is the backend API for the VanishVote application, a platform for creating and participating in anonymous polls.

## Features

- Create polls with customizable options
- Vote on polls anonymously
- Comment on polls
- Like polls
- View trending polls
- Set poll expiration times
- Private and public polls

## Tech Stack

- Node.js
- Express.js
- MongoDB Atlas

## API Endpoints

- `GET /api/health` - Health check endpoint
- `POST /api/polls` - Create a new poll
- `GET /api/polls/:id` - Get poll details and results
- `POST /api/polls/:id/vote` - Submit a vote
- `POST /api/polls/:id/comments` - Add a comment to a poll
- `POST /api/polls/:id/like` - Like a poll
- `GET /api/trending` - Get trending polls

## Deployment to Vercel

### Prerequisites

1. [Vercel account](https://vercel.com/signup)
2. [Vercel CLI](https://vercel.com/download) (optional for local deployment)
3. MongoDB Atlas account with a cluster set up

### Steps to Deploy

1. **Install Vercel CLI** (optional)
   ```
   npm install -g vercel
   ```

2. **Login to Vercel** (if using CLI)
   ```
   vercel login
   ```

3. **Set up Environment Variables in Vercel**
   
   You'll need to set up the following environment variables in your Vercel project settings:
   
   - `MONGODB_URI`: Your MongoDB connection string

4. **Deploy to Vercel**
   
   Using Vercel CLI:
   ```
   vercel
   ```
   
   Or connect your GitHub repository to Vercel for automatic deployments.

5. **Verify Deployment**
   
   Once deployed, visit the health check endpoint to verify the API is running:
   ```
   https://your-vercel-url.vercel.app/api/health
   ```

## Local Development

1. **Clone the repository**
   ```
   git clone <repository-url>
   cd vanishvote-backend
   ```

2. **Install dependencies**
   ```
   npm install
   ```

3. **Create a .env file**
   ```
   MONGODB_URI=your_mongodb_connection_string
   NODE_ENV=development
   ```

4. **Start the development server**
   ```
   npm run dev
   ```

5. **Access the API**
   ```
   http://localhost:5001
   ``` 