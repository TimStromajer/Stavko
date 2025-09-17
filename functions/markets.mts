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
      // if (!await authenticated(event.headers.authorization)) {
      //   return {
      //     statusCode: 401,
      //     body: JSON.stringify({ error: "Unauthorized" })
      //   };
      // }
      
      const { orderId, title, status, marketId } = event.queryStringParameters || {};
      
      let docs;
      if (marketId) {
        // Query Firestore for users with the given userId
        const snapshot = await db.collection("Markets").doc(marketId).get();

        docs = snapshot.exists
          ? [{ id: snapshot.id, ...snapshot.data() }]
          : [];
      } else {
        let queryRef: FirebaseFirestore.Query = db.collection("Markets");

        if (title) {
          queryRef = queryRef.where("title", "==", title);
        }
        if (status) {
          queryRef = queryRef.where("status", "==", status);
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
      console.error("Error fetching markets:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Failed to fetch markets" })
      };
    }
  } else if (event.httpMethod === "POST") {
    try {
      const authHeader = event.headers.authorization || "";

      const token = authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : null;

      if (!await authenticateRole(token, "marketManager")) {
        return {
          statusCode: 401,
          body: JSON.stringify({ error: "Unauthorized" })
        };
      }

      const reqData = JSON.parse(event.body || "{}");

      // remove column id from reqData
      delete reqData.id;

      // Convert openDate string to Firestore Timestamp
      if (reqData.openDate && typeof reqData.openDate === 'string') {
        reqData.openDate = admin.firestore.Timestamp.fromDate(new Date(reqData.openDate));
      }

      // Convert closeDate string to Firestore Timestamp
      if (reqData.closeDate && typeof reqData.closeDate === 'string') {
        reqData.closeDate = admin.firestore.Timestamp.fromDate(new Date(reqData.closeDate));
      }

      // Add a new market document using admin.firestore()
      const docRef = await db.collection("Markets").add(reqData);

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
      console.error("Error adding market:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Failed to add market" })
      };
    }
  } else if (event.httpMethod === "PUT") {
    try {
      const authHeader = event.headers.authorization || "";

      const token = authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : null;

      if (!await authenticateRole(token, "marketManager")) {
        return {
          statusCode: 401,
          body: JSON.stringify({ error: "Unauthorized" })
        };
      }

      const { marketId, status } = JSON.parse(event.body || "{}");
      if (!marketId || !status) {
        return { statusCode: 400, body: JSON.stringify({ error: "Missing marketId or status" }) };
      }

      // 1. Cancel all PENDING orders for this market
      // TODO: mark holdings as resolved
      const ordersSnap = await db.collection("Orders").where("marketId", "==", marketId).where("status", "==", "PENDING").get();
      const batch = db.batch();
      ordersSnap.forEach(doc => {
        batch.update(doc.ref, { status: "CANCELLED", lastChangeDate: new Date(), acceptorUserId: null });
      });
      await batch.commit();

      // 2. Resolve all holdings
      const holdingsSnap = await db.collection("Holdings").where("marketId", "==", marketId).get();
      const userValueUpdates = {};
      const holdingsBatch = db.batch();
      holdingsSnap.forEach(doc => {
        const data = doc.data();
        // Mark holding as resolved
        holdingsBatch.update(doc.ref, { status: "RESOLVED" });
        if ((status === "YES" && data.type === "YES") || (status === "NO" && data.type === "NO")) {
          userValueUpdates[data.userId] = (userValueUpdates[data.userId] || 0) + (data.amount || 0);
        }
      });
      await holdingsBatch.commit();
      // Update user values
      const userBatch = db.batch();
      for (const [userId, value] of Object.entries(userValueUpdates)) {
        const userRef = db.collection("Users").doc(userId);
        userBatch.update(userRef, { value: admin.firestore.FieldValue.increment(Number(value)) });
      }
      await userBatch.commit();

      // 3. Set market status to CLOSED
      const marketRef = db.collection("Markets").doc(marketId);
      await marketRef.update({ status: "CLOSED", result: status, closeDate: new Date() });

      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT",
          "Access-Control-Allow-Headers": "Content-Type"
        },
        body: JSON.stringify({ marketId, status: "CLOSED", result: status })
      };
    } catch (error) {
      console.error("Error closing market:", error);
      return { statusCode: 500, body: JSON.stringify({ error: "Failed to close market" }) };
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