
#!/bin/bash

# A more robust build script that includes cleanup and a full build process.
# This helps ensure the local environment is clean before deployment.

# --- Exit immediately if any command fails ---
set -e

echo "🔄 Starting rebuild and debug process..."

# --- Step 1: Clean build artifacts ---
# A thorough cleanup is essential for a reliable build.
echo "🧹 Cleaning old build artifacts..."
rm -rf .next
# Remove other potential cache directories if they exist
rm -rf node_modules/.cache
rm -rf dist

# --- Stop Genkit dev server if running ---
# This is crucial to prevent session/authentication context issues.
echo "🛑 Attempting to stop any running Genkit dev server..."
if pgrep -f "genkit dev" > /dev/null; then
    pkill -f "genkit dev"
    echo "✅ Genkit dev server stopped."
else
    echo "ℹ️ No Genkit dev server was running."
fi


# --- Load environment variables from .env file ---
if [ -f .env ]; then
  echo "📄 Loading .env variables..."
  # 'export' makes the variables available to subprocesses.
  # This command now specifically ignores the PRIVATE_KEY variable.
  export $(grep -v '^#' .env | grep -v 'PRIVATE_KEY' | xargs)
else
  echo "⚠️  No .env file found. This might cause issues if your app needs env variables."
fi

# --- Check for critical variables (optional but good practice) ---
if [ -z "$IMAGE_DOMAINS" ]; then
  echo "⚠️  IMAGE_DOMAINS is empty. Next.js remote images may not work correctly."
else
  echo "✅ IMAGE_DOMAINS loaded: $IMAGE_DOMAINS"
fi

# --- Step 2: Install dependencies ---
echo "📦 Installing or updating dependencies..."
npm install
# Check if the installation was successful. $? is the exit code of the last command.
if [ $? -ne 0 ]; then
  echo "❌ Error: 'npm install' failed. Check your network or package.json file."
  exit 1
fi

# --- Step 3: Rebuild Next.js Application ---
# This is the most crucial step, where your application is compiled.
echo "🏗  Rebuilding Next.js application..."
npm run build
if [ $? -ne 0 ]; then
  echo "❌ Error: 'npm run build' failed. This indicates a code or configuration error."
  echo "Please check the output above for specific errors in your code."
  exit 1
fi

# --- Step 4: Run a local production server (optional but recommended) ---
# This step simulates the production environment and helps catch issues
# that only appear after the build.
echo "🚀 Starting a local production server for testing..."
# The '&' runs the command in the background
npm start &
DEV_PID=$!
echo "Local server started with PID: $DEV_PID. Access it at http://localhost:3000"
echo "Press [Ctrl+C] to stop the script and the server."

# Wait for a key press to keep the script running
# You can test the app now and view console errors
read -n 1 -s -r -p "Press any key to stop the local server..."

# --- Step 5: Clean up background processes ---
echo "🛑 Stopping local server..."
kill "$DEV_PID"

echo "✅ Build and debug process complete."
