import express from 'express';
import { createHmac } from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { timingSafeEqual } from 'crypto';
dotenv.config();


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

const execAsync = promisify(exec);

// Repo-specific secrets
const secrets = {
  'Tulospalvelupalvelin': process.env.PALVELIN_SECRET,
  'Tulospalveluclient-react': process.env.CLIENT_SECRET,
};

// Repo to deploy script map
const deployScripts = {
  'Tulospalvelupalvelin': path.join(__dirname, 'Tulospalvelupalvelin/deploy.sh'),
  'Tulospalveluclient-react': path.join(__dirname, 'Tulospalveluclient-react/deploy.sh'),
};

// Validate GitHub signature
function verifySignature(secret, payload, signature) {
  const hmac = createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');

  const bufferSig = Buffer.from(signature || '', 'utf8');
  const bufferDigest = Buffer.from(digest, 'utf8');

  // Prevent DoS by only comparing if both buffers are the same length
  if (bufferSig.length !== bufferDigest.length) return false;

  return timingSafeEqual(bufferSig, bufferDigest);
}

app.post('/webhook', express.raw({ type: '*/*' }), async (req, res) => {
  try {
    const payload = req.body.toString();
    const data = JSON.parse(payload);
    const repoName = data?.repository?.name;

    if (!secrets[repoName] || !deployScripts[repoName]) {
      console.log(`Unknown repository: ${repoName}`);
      return res.sendStatus(400);
    }

    const signature = req.headers['x-hub-signature-256'];
    if (!verifySignature(secrets[repoName], payload, signature)) {
      console.log(`Invalid signature for ${repoName}`);
      return res.sendStatus(401);
    }

    res.status(200).send('Webhook received');

    const branch = data.ref; // e.g., refs/heads/main
    console.log(`Received push for ${repoName} on ${branch}`);

    if (branch !== process.env.GIT_BRANCH) {
        console.log('Git Branch does not match desired environment');
    }

    const { stdout, stderr } = await execAsync(deployScripts[repoName]);
    console.log(`Deployed ${repoName}:\n${stdout}`);
  } catch (err) {
    console.error(`Deployment error:\n${err}`);
  }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`🚀 Webhook server running on port ${PORT}`);
});