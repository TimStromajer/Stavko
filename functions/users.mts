import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, updateProfile  } from "firebase/auth";
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
const auth = getAuth(initializeApp(firebaseConfig));

export const handler = async (event: any, context: Context) => {
  if (event.httpMethod === "GET") {
    try {
      // if (!await authenticated(event.headers.authorization)) {
      //   return {
      //     statusCode: 401,
      //     body: JSON.stringify({ error: "Unauthorized" })
      //   };
      // }
      
      const { userId, name } = event.queryStringParameters || {};

      let docs;
      if (userId) {
        // Fetch a single user document by ID
        const snapshot = await db.collection("Users").doc(userId).get();

        docs = snapshot.exists
          ? [{ id: snapshot.id, ...snapshot.data() }]
          : [];
      } else {
        // Build query for Users collection
        let queryRef: FirebaseFirestore.Query = db.collection("Users");

        if (name) {
          queryRef = queryRef.where("name", "==", name);
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
      console.error("Error fetching users:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Failed to fetch users" })
      };
    }
  } else if (event.httpMethod === "POST") {
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

      const reqData = JSON.parse(event.body || "{}");

      // Add user to Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, reqData.email, reqData.password);
      await updateProfile(userCredential.user, {
        displayName: reqData.name
      });
      
      // Add user to Firestore
      await db.collection("Users").doc(userCredential.user.uid).set({
        name: reqData.name,
        value: 0,
      });

      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST",
          "Access-Control-Allow-Headers": "Content-Type"
        },
        body: JSON.stringify({ id: userCredential.providerId, email: userCredential.user.email })
      };
    } catch (error) {
      console.error("Error adding user:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Failed to add user" })
      };
    }

  } else if (event.httpMethod === "PUT") {
    try {
      const authHeader = event.headers.authorization || "";

      const token = authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : null;

      if (!await authenticateRole(token, "admin")) {
        return {
          statusCode: 401,
          body: JSON.stringify({ error: "Unauthorized" })
        };
      }

      const reqData = JSON.parse(event.body || "{}");
      const { userId, role, action } = reqData;
      if (!userId || !role || !action) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Missing userId, role, or action" })
        };
      }
      // Get current custom claims
      const userRecord = await admin.auth().getUser(userId);
      let roles: string[] = Array.isArray(userRecord.customClaims?.roles) ? userRecord.customClaims.roles : [];
      if (action === "add") {
        if (!roles.includes(role)) roles.push(role);
      } else if (action === "remove") {
        roles = roles.filter(r => r !== role);
      } else {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Invalid action. Must be add or remove." })
        };
      }
      // Set custom claims in Firebase Auth
      if (roles.length > 0) {
        await admin.auth().setCustomUserClaims(userId, { roles });
      } else {
        await admin.auth().setCustomUserClaims(userId, {});
      }
      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT",
          "Access-Control-Allow-Headers": "Content-Type"
        },
        body: JSON.stringify({ userId, roles })
      };
    } catch (error) {
      console.error("Error updating user roles:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Failed to update user roles" })
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

let authenticateRole = async (token: string, role: string) => {
  if (!token) {
    return false;
  }
  const decoded = await admin.auth().verifyIdToken(token);
  if (!decoded) {
    return false;
  }
  return hasRole(decoded, role);
}

let hasRole = (decodedToken: admin.auth.DecodedIdToken, role: string) => {
  const roles: string[] = Array.isArray(decodedToken.roles) ? decodedToken.roles : [];
  return roles.includes(role);
}