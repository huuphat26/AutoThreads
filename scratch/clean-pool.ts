import fs from "fs";
import path from "path";

const POOL_FILE = path.join(process.cwd(), "data", "content-pool.json");

function cleanContent() {
  if (!fs.existsSync(POOL_FILE)) {
    console.log("No content pool file found.");
    return;
  }

  const store = JSON.parse(fs.readFileSync(POOL_FILE, "utf-8"));
  let count = 0;

  store.items = store.items.map((item: any) => {
    const topic = item.topicLabel;
    if (!topic || topic === "No Topic") return item;

    // Check if content starts with topic
    const fields = ["fbContent", "threadsContent", "igCaption"];
    let modified = false;

    fields.forEach((field) => {
      if (item[field] && item[field].startsWith(topic)) {
        // Remove topic + double newline
        const cleaned = item[field].replace(new RegExp(`^${topic}\\s*\\n+`, "i"), "");
        if (cleaned !== item[field]) {
          item[field] = cleaned;
          modified = true;
        }
      }
    });

    if (modified) count++;
    return item;
  });

  fs.writeFileSync(POOL_FILE, JSON.stringify(store, null, 2), "utf-8");
  console.log(`Cleaned ${count} items in content pool.`);
}

cleanContent();
