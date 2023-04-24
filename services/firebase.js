/* eslint-disable no-underscore-dangle */
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

const serviceAccount = require('./firebaseSDK.json');

initializeApp({
  credential: cert(serviceAccount),
});

const DB = getFirestore();

// const addToFirebase = async (tourneyId, bracketId, matches) => {
//   try {
//     const data = {
//       tourneyId,
//       timeStamp: Timestamp.now(),
//     };
//     await DB.collection('brackets').doc(bracketId).set(data);

//     await matches.forEach(async (match) => {
//       await DB.collection('brackets')
//         .doc(bracketId)
//         .collection(match._id.toString())
//         .add({
//           name: 'Moderator',
//           message: 'Welcome to 3not3',
//           timeStamp: Timestamp.now(),
//         });
//     });

//     return;
//   } catch (error) {
//     logger.error('Firebase ERROR', error);
//     throw new Error(error);
//   }
// };

module.exports = { DB, Timestamp };
