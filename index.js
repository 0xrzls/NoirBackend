const express = require("express");
const fs = require("fs");
const { exec } = require("child_process");
const path = require("path");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PROJECT_DIR = "/tmp/noir_project";

app.post("/compile", async (req, res) => {
  const userCode = req.body.code;
  const mainFile = path.join(PROJECT_DIR, "src", "main.nr");

  try {
    // Reset & prepare project dir
    if (fs.existsSync(PROJECT_DIR)) fs.rmSync(PROJECT_DIR, { recursive: true });
    fs.mkdirSync(path.join(PROJECT_DIR, "src"), { recursive: true });

    // Write updated Nargo.toml with type = "bin"
    fs.writeFileSync(
      path.join(PROJECT_DIR, "Nargo.toml"),
      `[package]
name = "user_project"
version = "0.1.0"
edition = "2021"
type = "bin"`
    );

    // Write user code
    fs.writeFileSync(mainFile, userCode);

    // Compile
    exec(`cd ${PROJECT_DIR} && nargo compile --silence-warnings`, (err, stdout, stderr) => {
      if (err) {
        return res.status(400).json({ error: stderr || err.message });
      }

      const outputPath = path.join(PROJECT_DIR, "target", "user_project.json");
      if (!fs.existsSync(outputPath)) {
        return res.status(500).json({ error: "Compiled JSON not found." });
      }

      const output = fs.readFileSync(outputPath, "utf-8");
      res.json({ success: true, compiled: JSON.parse(output) });
    });
  } catch (err) {
    console.error("❌ Internal error:", err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = 4000;
app.listen(PORT, () => console.log(`🟢 Noir backend compiler ready at http://localhost:${PORT}`));
