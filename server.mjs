import express from 'express';
import { createHmac } from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
dotenv.config();


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json({ type: '*/*' }));

const execAsync = promisify(exec);

// Repo-specific secrets
const secrets = {
  'tulospalvelupalvelin': process.env.PALVELIN_SECRET,
  'tulospalveluclient': process.env.CLIENT_SECRET,
};

// Repo to deploy script map
const deployScripts = {
  'tulospalvelupalvelin': path.join(__dirname, 'Tulospalvelupalvelin/deploy.sh'),
  'tulospalveluclient': path.join(__dirname, 'Tulospalveluclient-react/deploy.sh'),
};

// Validate GitHub signature
function verifySignature(secret, payload, signature) {
  const hmac = createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  return signature === digest;
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

    const branch = data.ref; // e.g., refs/heads/main
    console.log(`Received push for ${repoName} on ${branch}`);

    if (branch !== process.env.GIT_BRANCH) {
        console.log('Git Branch does not match desired environment');
        return res.sendStatus(200);
    }

    const { stdout, stderr } = await execAsync(deployScripts[repoName]);
    console.log(`Deployed ${repoName}:\n${stdout}`);
    res.status(200).send('Deployment complete');
  } catch (err) {
    console.error(`Deployment error:\n${err}`);
    res.status(500).send('Deployment failed');
  }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`🚀 Webhook server running on port ${PORT}`);
});