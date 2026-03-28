const supabase = require("./backend/supabaseClient");

async function run() {
  const fileId = "e648321a-9842-4e7e-a133-4f509f88e7e0";
  
  const { count, error } = await supabase
    .from("file_versions")
    .select("*", { count: 'exact', head: true })
    .eq("file_id", fileId);

  if (error) {
    console.error("Error fetching versions count:", error);
    return;
  }
  console.log("Cattlelog version count:", count);
}
run();
