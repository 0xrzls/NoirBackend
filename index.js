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
const BB_PATH = "/root/aztec-packages/barretenberg/cpp/build/bin/bb";

app.post("/compile", async (req, res) => {
  const userCode = req.body.code;
  const mainFile = path.join(PROJECT_DIR, "src", "main.nr");

  try {
    if (fs.existsSync(PROJECT_DIR)) fs.rmSync(PROJECT_DIR, { recursive: true });
    fs.mkdirSync(path.join(PROJECT_DIR, "src"), { recursive: true });

    fs.writeFileSync(
      path.join(PROJECT_DIR, "Nargo.toml"),
      `[package]
name = "user_project"
version = "0.1.0"
edition = "2021"
type = "bin"`
    );

    fs.writeFileSync(mainFile, userCode);

    exec(`cd ${PROJECT_DIR} && nargo compile --silence-warnings`, (err, stdout, stderr) => {
      if (err) return res.status(400).json({ error: stderr || err.message });

      const outputPath = path.join(PROJECT_DIR, "target", "user_project.json");
      if (!fs.existsSync(outputPath)) {
        return res.status(500).json({ error: "Compiled JSON not found." });
      }

      const output = fs.readFileSync(outputPath, "utf-8");
      res.json({ success: true, compiled: JSON.parse(output) });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/prove", async (req, res) => {
  const userCode = req.body.code;
  const mainFile = path.join(PROJECT_DIR, "src", "main.nr");

  try {
    if (fs.existsSync(PROJECT_DIR)) fs.rmSync(PROJECT_DIR, { recursive: true });
    fs.mkdirSync(path.join(PROJECT_DIR, "src"), { recursive: true });

    fs.writeFileSync(
      path.join(PROJECT_DIR, "Nargo.toml"),
      `[package]
name = "user_project"
version = "0.1.0"
edition = "2021"
type = "bin"`
    );

    fs.writeFileSync(mainFile, userCode);

    // compile & execute to generate witness
    exec(`cd ${PROJECT_DIR} && nargo compile && nargo execute`, (err, stdout, stderr) => {
      if (err) return res.status(400).json({ error: stderr || err.message });

      const bytecode = path.join(PROJECT_DIR, "target", "user_project.json");
      const witness = path.join(PROJECT_DIR, "target", "user_project.gz");
      const proofDir = path.join(PROJECT_DIR, "proof");

      if (!fs.existsSync(bytecode) || !fs.existsSync(witness)) {
        return res.status(400).json({ error: "Bytecode or witness not found. Compile first" });
      }

      fs.mkdirSync(proofDir, { recursive: true });

      const cmd = `${BB_PATH} prove --scheme ultra_honk -b ${bytecode} -w ${witness} -o ${proofDir}`;
      exec(cmd, (err2) => {
        if (err2) return res.status(400).json({ error: err2.message });

        const proofFile = path.join(proofDir, "proof");
        if (!fs.existsSync(proofFile)) {
          return res.status(500).json({ error: "Proof file not found." });
        }

        const proof = fs.readFileSync(proofFile);
        res.json({ success: true, proof: proof.toString("base64") });
      });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = 4000;
app.listen(PORT, () => console.log(`🟢 Noir backend compiler ready at http://localhost:${PORT}`));
