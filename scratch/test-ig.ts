import { instagramService } from "../lib/services/instagram.service";

async function testIG() {
  console.log("--- Testing Instagram Connection (No dotenv) ---");
  try {
    const profile = await instagramService.getProfile();
    console.log("✅ Connection Successful!");
    console.log("Profile:", JSON.stringify(profile, null, 2));
    
    try {
      const status = await instagramService.getTokenStatus();
      console.log("Token Status:", JSON.stringify(status, null, 2));
    } catch (e) {
      console.log("⚠️ Could not get token status (likely missing App ID/Secret):", e instanceof Error ? e.message : e);
    }
  } catch (err) {
    console.log("❌ Connection Failed!");
    if (err instanceof Error) {
      console.log("Error Message:", err.message);
      // @ts-ignore
      if (err.raw) {
        // @ts-ignore
        console.log("Raw API Error:", JSON.stringify(err.raw, null, 2));
      }
    } else {
      console.log("Error:", err);
    }
  }
}

testIG();
