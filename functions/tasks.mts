import { Context } from "@netlify/functions";
import admin from "firebase-admin";

require('dotenv').config();

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: "stavko-cf3b1.firebaseapp.com",
  projectId: "stavko-cf3b1",
  storageBucket: "stavko-cf3b1.firebasestorage.app",
  messagingSenderId: "246765541976",
  appId: "1:246765541976:web:d07503021dcdc21d41482d",
  measurementId: "G-H2CQ8VGD71"
};

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  })
});

// Initialize Firebase
const db = admin.firestore();

let memory = {};

export const handler = async (event: any, context: Context) => {
  if (event.httpMethod === "GET") {
    // generate 10 random coordinates from 0-1
    const coordinates = Array.from({ length: 5 }, () => ({
      x: Math.random(),
      y: Math.random()
    }));
    const uuid = crypto.randomUUID();

    memory[uuid] = coordinates;

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT",
        "Access-Control-Allow-Headers": "Content-Type"
      },
      body: JSON.stringify({ coordinates, uuid })
    };
  } else if (event.httpMethod === "POST") {
    const authHeader = event.headers.authorization || "";

    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    let userId = await getAuthenticatedUser(token)
    if (!userId) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Unauthorized" })
      };
    }

    const { uuid, coordinatesReqest } = JSON.parse(event.body);
    if (!uuid || !memory[uuid]) {
        return {
          statusCode: 401,
          body: JSON.stringify({ error: "Task failed" })
        };
    }
    const coordinates = memory[uuid];
    delete memory[uuid];

    await addValueToUser(userId, coordinates.length * 0.01);

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "*",
        "Access-Control-Allow-Headers": "*"
      },
      body: JSON.stringify("")
    };
  } else {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "*",
        "Access-Control-Allow-Headers": "*"
      },
      body: JSON.stringify("")
    };
  }
}

let addValueToUser = async (userId: string, value: number) => {
  try {
    const userDoc = db.collection("Users").doc(userId);
    const userSnapshot = await userDoc.get();
    if (!userSnapshot.exists) {
      throw new Error("User not found");
    }
    const userData = userSnapshot.data() as Record<string, any>;
    const userValue: number = userData.value || 0;
    if (userValue < value) {
      throw new Error("Insufficient balance");
    }
    // update user value and round it to 2 decimal places
    console.log("Adding value to user:", userId, userValue, value);
    const newValue = Number(userValue) + Number(value);
    await userDoc.update({
      value: Number(newValue.toFixed(2))
    });
  } catch (error) {
    console.error("Error removing value from user:", error);
  }
}

let getAuthenticatedUser = async (token: string) => {
  if (!token) {
    return false;
  }

  const decoded = await admin.auth().verifyIdToken(token);
  
  if (!decoded) {
    return false;
  }

  return decoded.uid;
}