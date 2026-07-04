import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
export async function saveDemoUserProfile(data) {
  await setDoc(doc(db, "users", "demo-user-artur"), {
    name: "Artur Babayan",
    xp: data.xp || 0,
    coins: data.coins || 0,
    cities: data.cities || 0,
    countries: data.countries || 0,
    updatedAt: new Date().toISOString(),
  });

  console.log("✅ Firebase profile saved");
}

export async function saveDemoCheckin(checkin) {
  const safeCellId = checkin.cellId || `manual-${Date.now()}`;

  await setDoc(
    doc(db, "users", "demo-user-artur", "checkins", safeCellId),
    {
      cellId: safeCellId,
      city: checkin.city || "Unknown",
      country: checkin.country || "Unknown",
      latitude: checkin.latitude || null,
      longitude: checkin.longitude || null,
      xp: checkin.xp || 10,
      createdAt: new Date().toISOString(),
    },
    { merge: true }
  );

  console.log("✅ Firebase check-in saved");
}