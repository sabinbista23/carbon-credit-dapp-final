import dotenv from "dotenv";
import express from "express";
import multer from "multer";

dotenv.config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json({ limit: "2mb" }));

const requireEnv = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
};

const getPinataHeaders = () => {
  const apiKey = requireEnv("PINATA_API_KEY");
  const apiSecret = requireEnv("PINATA_SECRET_API_KEY");
  return {
    pinata_api_key: apiKey,
    pinata_secret_api_key: apiSecret,
  };
};

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// Upload a file to Pinata (IPFS) securely from the server (no keys in the browser)
app.post("/api/pinata/pinFile", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Missing file (field name: file)" });
    }

    const { originalname, mimetype, buffer } = req.file;
    const name = req.body?.name || originalname || "certificate";

    const form = new FormData();
    form.append("file", new Blob([buffer], { type: mimetype }), originalname);
    form.append("pinataMetadata", JSON.stringify({ name }));

    const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        ...getPinataHeaders(),
      },
      body: form,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return res.status(502).json({
        error: "Pinata upload failed",
        details: data,
      });
    }

    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message || "Server error" });
  }
});

// Unpin (delete) a file from Pinata
app.delete("/api/pinata/unpin/:hash", async (req, res) => {
  try {
    const hash = req.params.hash;
    if (!hash) {
      return res.status(400).json({ error: "Missing IPFS hash" });
    }

    const response = await fetch(`https://api.pinata.cloud/pinning/unpin/${hash}`, {
      method: "DELETE",
      headers: {
        ...getPinataHeaders(),
      },
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return res.status(502).json({
        error: "Pinata unpin failed",
        details: data,
      });
    }

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Server error" });
  }
});

const port = Number(process.env.PORT || 5001);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Pinata backend listening on http://localhost:${port}`);
});

