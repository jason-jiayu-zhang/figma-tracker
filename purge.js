const supabase = require("./backend/supabaseClient");
const fs = require("fs");
const path = require("path");

async function run() {
  const fileId = "e648321a-9842-4e7e-a133-4f509f88e7e0";
  const fileKey = "OmcL296OeqZ4xsHzNcap65";

  console.log("Deleting daily_activity for Cattlelog...");
  const { error: err1, count: c1 } = await supabase
    .from("daily_activity")
    .delete()
    .eq("file_id", fileId);

  if (err1) console.error("Error deleting daily_activity:", err1);
  else console.log("Deleted daily_activity records.");

  console.log("Deleting file_versions for Cattlelog...");
  const { error: err2, count: c2 } = await supabase
    .from("file_versions")
    .delete()
    .eq("file_id", fileId);

  if (err2) console.error("Error deleting file_versions:", err2);
  else console.log("Deleted file_versions records.");

  const statePath = path.join(__dirname, "pagination_state.json");
  if (fs.existsSync(statePath)) {
    let state = JSON.parse(fs.readFileSync(statePath, "utf8"));
    if (state[fileKey]) {
      console.log("Resetting pagination_state.json for Cattlelog...");
      delete state[fileKey];
      fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
      console.log("pagination_state.json updated.");
    }
  }
}
run();
