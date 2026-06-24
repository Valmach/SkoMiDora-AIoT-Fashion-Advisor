import { getAuth } from "firebase/auth";

/**
 * Patched upload function to bypass browser-level XHR/Fetch interference
 * by using a direct HTTP multipart/form-data request.
 */
export async function uploadToCloset(file: File, userId: string) {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Upload failed: User not authenticated.");
  }

  // Get the ID token to authenticate the proxy request
  const token = await user.getIdToken();

  const formData = new FormData();
  formData.append("file", file);
  formData.append("userId", userId);

  // Direct HTTP call to your own function, bypassing Firebase Storage SDK logic
  const response = await fetch(
    "https://us-central1-styleai-footwear.cloudfunctions.net/uploadProxy",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Upload Proxy failed: ${response.status} ${JSON.stringify(errorData)}`);
  }

  return response.json();
}