// Remove client SDK imports, use admin.firestore()
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
      // const authHeader = event.headers.authorization || "";

      // const token = authHeader.startsWith("Bearer ")
      //   ? authHeader.split(" ")[1]
      //   : null;

      // if (!await authenticated(token)) {
      //   return {
      //     statusCode: 401,
      //     body: JSON.stringify({ error: "Unauthorized" })
      //   };
      // }

      const { orderId, marketId, userId, action, type, status } = event.queryStringParameters || {};
      
      let docs;
      if (orderId) {
        // Fetch a single order by ID
        const snapshot = await db.collection("Orders").doc(orderId).get();

        docs = snapshot.exists
          ? [{ id: snapshot.id, ...snapshot.data() }]
          : [];
      } else {
        // Build query for Orders collection
        let queryRef: FirebaseFirestore.Query = db.collection("Orders");

        if (marketId) {
          queryRef = queryRef.where("marketId", "==", marketId);
        }
        if (userId) {
          queryRef = queryRef.where("userId", "==", userId);
        }
        if (action) {
          queryRef = queryRef.where("action", "==", action);
        }
        if (type) {
          queryRef = queryRef.where("type", "==", type);
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
      console.error("Error fetching orders:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Failed to fetch orders" })
      };
    }
  } else if (event.httpMethod === "POST") {
    try {
      const reqData = JSON.parse(event.body || "{}");
      const authHeader = event.headers.authorization || "";

      const token = authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : null;

      if (await authenticatedUserId(token, reqData.userId) === false) {
        return { statusCode: 403, body: "Unauthorized" };
      }

      // check if action is valid
      if (reqData.action !== 'BUY' && reqData.action !== 'SELL') {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Invalid action. Must be BUY or SELL." })
        };
      }

      // check the market is OPEN
      const marketDoc = db.collection("Markets").doc(reqData.marketId);
      const marketSnapshot = await marketDoc.get();
      if (!marketSnapshot.exists) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: "Market not found" })
        };
      }

      // check if action is BUY that user has enough value
      if (reqData.action === 'BUY') {
        const userValue = await getuserValue(reqData.userId);
        if (userValue < reqData.price * reqData.amount) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: "Insufficient balance for BUY action" })
          };
        }
      }

      // check if action is SELL that user has enough holdings
      if (reqData.action === 'SELL') {
        const userHoldings = await getUserHoldings(reqData.userId, reqData.marketId, reqData.type);
        if (userHoldings < reqData.amount) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: "Insufficient holdings for SELL action" })
          };
        }
      }

      // remove column id from reqData
      delete reqData.id;

      // set placedDate to current date
      reqData.placedDate = new Date();
      reqData.status = 'PENDING';
      reqData.lastChangeDate = new Date();
      reqData.acceptorUserId = null;

      // Add a new comment to Firestore
      const docRef = await db.collection("Orders").add(reqData);

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
      console.error("Error adding order:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Failed to add order" })
      };
    }
  } else if (event.httpMethod === "PUT") {
    try {
      const reqData = JSON.parse(event.body || "{}");
      const { orderAction, orderId, userId } = reqData;

      const authHeader = event.headers.authorization || "";

      const token = authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : null;

      if (await authenticatedUserId(token, userId) === false) {
        return { statusCode: 403, body: "Unauthorized" };
      }

      // get the order document
      const orderDoc = db.collection("Orders").doc(orderId);

      // get order data
      const orderSnapshot = await orderDoc.get();

      if (!orderSnapshot.exists) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: "Order not found" })
        };
      }

      // check that the market is still open
      const marketId = orderSnapshot.data()?.marketId;
      const marketDoc = db.collection("Markets").doc(marketId);
      const marketSnapshot = await marketDoc.get();
      if (!marketSnapshot.exists) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: "Market not found" })
        };
      }

      // check that order status is PENDING
      const orderStatus = orderSnapshot.data()?.status;

      if (orderStatus !== "PENDING") {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Order is not in PENDING status" })
        };
      }

      // get order data
      const orderData = orderSnapshot.data() as Record<string, any>;
      const type = orderData.type;
      const action = orderData.action;
      const orderMadeByUserId = orderData.userId;
      const counterType = type === 'YES' ? 'NO' : 'YES';

      // get user holdings and value
      let orderMadeByUserValue = await getuserValue(orderMadeByUserId);
      let userValue = await getuserValue(userId);
      let orderMadeByUserHoldings = await getUserHoldings(orderMadeByUserId, orderData.marketId, type);

      if (orderAction === 'ACCEPT') {
        if (action === 'BUY') {
          // check if user has enough value
          if (userValue < (1 - orderData.price) * orderData.amount) {
            return {
              statusCode: 400,
              body: JSON.stringify({ error: "Insufficient balance" })
            };
          }
          // check if creator user has enough value
          if (orderMadeByUserValue < orderData.price * orderData.amount) {
            return {
              statusCode: 400,
              body: JSON.stringify({ error: "Creator user has insufficient balance" })
            };
          }
          // remove value from acceptor user
          await addValueToUser(userId, -(1-orderData.price) * orderData.amount);
          // remove value creator user
          await addValueToUser(orderMadeByUserId, -orderData.price * orderData.amount);
          // add amount to holdings of acceptor user
          await addValueToHoldings(userId, orderData.marketId, orderData.amount, counterType);
          // add amount to holdings of creator user
          await addValueToHoldings(orderMadeByUserId, orderData.marketId, orderData.amount, type);
          // update order status to ACCEPTED
          await orderDoc.update({
            status: 'ACCEPTED',
            lastChangeDate: new Date(),
            acceptorUserId: userId
          });
          return {
            statusCode: 200,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "GET, POST",
              "Access-Control-Allow-Headers": "Content-Type"
            },
            body: JSON.stringify({ id: orderId, ...orderData })
          };
        } else if (action === 'SELL') {
          // check if user has enough value
          if (userValue < orderData.price * orderData.amount) {
            return {
              statusCode: 400,
              body: JSON.stringify({ error: "Insufficient balance" })
            };
          }
          // check if creator user has enough holdings
          if (orderMadeByUserHoldings < orderData.amount) {
            return {
              statusCode: 400,
              body: JSON.stringify({ error: "Creator user has insufficient holdings" })
            };
          }
          // remove value from acceptor user
          await addValueToUser(userId, -orderData.price * orderData.amount);
          // add value creator user
          await addValueToUser(orderMadeByUserId, orderData.price * orderData.amount);
          // add amount to holdings of acceptor user
          await addValueToHoldings(userId, orderData.marketId, orderData.amount, type);
          // remove amount to holdings of creator user
          await addValueToHoldings(orderMadeByUserId, orderData.marketId, -orderData.amount, type);
          // update order status to ACCEPTED
          await orderDoc.update({
            status: 'ACCEPTED',
            lastChangeDate: new Date(),
            acceptorUserId: userId
          });
          return {
            statusCode: 200,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "GET, POST",
              "Access-Control-Allow-Headers": "Content-Type"
            },
            body: JSON.stringify({ id: orderId, ...orderData })
          };
        }
      } else if (orderAction === 'CANCEL') {
        // update order status to CANCELLED
        await orderDoc.update({
          status: 'CANCELLED',
          lastChangeDate: new Date(),
          acceptorUserId: null
        });
        return {
          statusCode: 200,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST",
            "Access-Control-Allow-Headers": "Content-Type"
          },
          body: JSON.stringify({ id: orderId, ...orderData })
        };
      }

    } catch (error) {
      console.error("Error changing order:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Failed to change order" })
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

let addValueToHoldings = async (userId: string, marketId: string, amount: number, type: string) => {
  try {
    const holdingsQuery = db.collection("Holdings")
      .where("userId", "==", userId)
      .where("marketId", "==", marketId)
      .where("type", "==", type);
    const snapshot = await holdingsQuery.get();
    if (!snapshot.empty) {
      // update existing holdings
      const holdingsDoc = snapshot.docs[0].ref;
      const holdingsData = snapshot.docs[0].data() as Record<string, any>;
      await holdingsDoc.update({
        amount: (holdingsData.amount || 0) + amount
      });
    } else {
      // create new holdings
      await db.collection("Holdings").add({
        userId,
        marketId,
        amount,
        type
      });
    }
  } catch (error) {
    console.error("Error adding value to holdings:", error);
  }
}

let getuserValue = async (userId: string) => {
  try {
    const userDoc = db.collection("Users").doc(userId);
    const userSnapshot = await userDoc.get();
    if (!userSnapshot.exists) {
      throw new Error("User not found");
    }
    const userData = userSnapshot.data() as Record<string, any>;
    return userData.value || 0;
  } catch (error) {
    console.error("Error fetching user value:", error);
    return 0;
  }
}

let getUserHoldings = async (userId: string, marketId: string, type: string) => {
  try {
    const holdingsQuery = db.collection("Holdings")
      .where("userId", "==", userId)
      .where("marketId", "==", marketId)
      .where("type", "==", type);
    const snapshot = await holdingsQuery.get();
    if (snapshot.empty) {
      return 0;
    }
    const holdingsData = snapshot.docs[0].data() as Record<string, any>;
    // return only the amount
    return holdingsData.amount || 0;
  } catch (error) {
    console.error("Error fetching user holdings:", error);
    return 0;
  }
}

let authenticatedUserId = async (token: string, uid) => {
  if (!token) {
    return false;
  }

  const decoded = await admin.auth().verifyIdToken(token);
  
  if (decoded.uid !== uid) {
    return false;
  }

  return true;
}

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