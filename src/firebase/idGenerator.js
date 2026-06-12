import { db } from './config';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

/**
 * Generates an auto-incrementing ID for a specific collection.
 * Queries the collection to find the highest existing custom ID and increments it.
 * 
 * @param {string} type - The type of ID (e.g., 'employee', 'customer')
 * @param {string} prefix - The prefix for the ID (e.g., 'EMP', 'CUS')
 * @returns {Promise<string>} The generated ID (e.g., 'EMP001')
 */
export const generateId = async (type, prefix) => {
  const collectionName = type === 'employee' ? 'employees' : 'customers';
  const collectionRef = collection(db, collectionName);

  try {
    // Attempt to get the latest document sorted by customId descending
    const q = query(collectionRef, orderBy('customId', 'desc'), limit(1));
    const querySnapshot = await getDocs(q);

    let nextValue = 1;

    if (!querySnapshot.empty) {
      const latestDoc = querySnapshot.docs[0];
      const latestCustomId = latestDoc.data().customId;
      
      if (latestCustomId && latestCustomId.startsWith(prefix)) {
        const idNumberStr = latestCustomId.substring(prefix.length);
        const idNumber = parseInt(idNumberStr, 10);
        if (!isNaN(idNumber)) {
          nextValue = idNumber + 1;
        }
      }
    } else {
      // Fallback: if the collection is empty or query returns nothing,
      // let's double check if there are documents without customId by fetching all
      const allSnapshot = await getDocs(collectionRef);
      let maxId = 0;
      allSnapshot.forEach((doc) => {
        const cid = doc.data().customId;
        if (cid && cid.startsWith(prefix)) {
          const num = parseInt(cid.substring(prefix.length), 10);
          if (!isNaN(num) && num > maxId) {
            maxId = num;
          }
        }
      });
      nextValue = maxId + 1;
    }

    // Format with leading zeros: EMP001
    const formattedValue = nextValue.toString().padStart(3, '0');
    return `${prefix}${formattedValue}`;
  } catch (error) {
    console.warn(`Query-based ID generation failed for ${type}, attempting full-scan fallback:`, error);
    
    // Ultimate fallback: Scan all documents in the collection to find the highest ID.
    // This bypasses any potential "orderBy" index requirements/errors.
    try {
      const querySnapshot = await getDocs(collectionRef);
      let maxId = 0;
      querySnapshot.forEach((doc) => {
        const cid = doc.data().customId;
        if (cid && cid.startsWith(prefix)) {
          const num = parseInt(cid.substring(prefix.length), 10);
          if (!isNaN(num) && num > maxId) {
            maxId = num;
          }
        }
      });
      const nextValue = maxId + 1;
      const formattedValue = nextValue.toString().padStart(3, '0');
      return `${prefix}${formattedValue}`;
    } catch (fallbackError) {
      console.error(`Fallback ID generation also failed for ${type}:`, fallbackError);
      // If everything fails, generate a random number
      const randomSuffix = Math.floor(100 + Math.random() * 900); // 3 digit random
      return `${prefix}${randomSuffix}`;
    }
  }
};
