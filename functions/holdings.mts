import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc, query, where, doc, getDoc, QueryConstraint } from "firebase/firestore";
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

export const handler = async (event: any, context: Context) => {
  if (event.httpMethod === "GET") {
    try {
      
      const authHeader = event.headers.authorization || "";

      const token = authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : null;

      if (!await authenticated(token)) {
        return {
          statusCode: 401,
          body: JSON.stringify({ error: "Unauthorized" })
        };
      }

      const { holdingId, marketId, userId, type } = event.queryStringParameters || {};

      let docs;
      if (holdingId) {
        // Fetch a single holding by ID
        const snapshot = await db.collection("Holdings").doc(holdingId).get();

        docs = snapshot.exists
          ? [{ id: snapshot.id, ...snapshot.data() }]
          : [];
      } else {
        // Build query for Holdings collection
        let queryRef: FirebaseFirestore.Query = db.collection("Holdings");

        if (marketId) {
          queryRef = queryRef.where("marketId", "==", marketId);
        }
        if (userId) {
          queryRef = queryRef.where("userId", "==", userId);
        }
        if (type) {
          queryRef = queryRef.where("type", "==", type);
        }

        const snapshot = await queryRef.get();

        docs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      }

      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST",
          "Access-Control-Allow-Headers": "Content-Type"
        },
        body: JSON.stringify(docs)
      };
    } catch (error) {
      console.error("Error fetching holdings:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Failed to fetch holdings" })
      };
    }
  } else if (event.httpMethod === "POST") {
    try {

      // return error
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Not allowed" })
      };

      const reqData = JSON.parse(event.body || "{}");

      // remove column id from reqData
      delete reqData.id;

      // Add a new comment to Firestore
      const docRef = await addDoc(collection(db, "Markets"), reqData);

      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST",
          "Access-Control-Allow-Headers": "Content-Type"
        },
        body: JSON.stringify({ id: docRef.id, ...reqData })
      };
    } catch (error) {
      console.error("Error adding holding:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Failed to add holding" })
      };
    }
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
};

let authenticated = async (token: string) => {

  if (!token) {
    return false;
  }

  const decoded = await admin.auth().verifyIdToken(token);
  
  if (!decoded) {
    return false;
  }

  return true;
}