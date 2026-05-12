import { instagramService } from "../lib/services/instagram.service";
import { facebookService } from "../lib/services/facebook.service";

async function testConnections() {
  console.log("--- Testing Instagram Connection ---");
  try {
    const profile = await instagramService.getProfile();
    console.log("✅ Instagram: Connected!");
    console.log(`   Username: ${profile.username}`);
  } catch (err) {
    console.log("❌ Instagram: Failed!");
    console.log(`   Error: ${err instanceof Error ? err.message : err}`);
  }

  console.log("\n--- Testing Facebook Connection ---");
  try {
    const page = await facebookService.getPage();
    console.log("✅ Facebook: Connected!");
    console.log(`   Page Name: ${page.name}`);
  } catch (err) {
    console.log("❌ Facebook: Failed!");
    console.log(`   Error: ${err instanceof Error ? err.message : err}`);
  }
}

testConnections();
