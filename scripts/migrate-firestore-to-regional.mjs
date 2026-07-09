#!/usr/bin/env node

const DEFAULT_REGION_ID = "aichi";
const SHARED_DOC_IDS = ["reviews", "storeProfiles", "favorites", "excluded"];

function parseArgs(argv) {
  const options = {
    regionId: DEFAULT_REGION_ID,
    execute: false,
    overwrite: false,
    verify: false,
    serviceAccountPath: process.env.GOOGLE_APPLICATION_CREDENTIALS || "",
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || "",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--execute") {
      options.execute = true;
    } else if (arg === "--dry-run") {
      options.execute = false;
    } else if (arg === "--verify") {
      options.verify = true;
      options.execute = false;
    } else if (arg === "--overwrite") {
      options.overwrite = true;
    } else if (arg === "--region") {
      options.regionId = requireValue(argv, index, arg);
      index += 1;
    } else if (arg === "--service-account") {
      options.serviceAccountPath = requireValue(argv, index, arg);
      index += 1;
    } else if (arg === "--project-id") {
      options.projectId = requireValue(argv, index, arg);
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function requireValue(argv, index, arg) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${arg} requires a value`);
  }
  return value;
}

function printHelp() {
  console.log(`
Migrate Firestore sharedState documents into a regional path.

Default mode is dry-run. No writes happen unless --execute is passed.

Old path:
  sharedState/{docId}

New path:
  regions/{regionId}/sharedState/{docId}

Usage:
  node scripts/migrate-firestore-to-regional.mjs --service-account ./service-account.json --dry-run
  node scripts/migrate-firestore-to-regional.mjs --service-account ./service-account.json --execute
  node scripts/migrate-firestore-to-regional.mjs --service-account ./service-account.json --verify

Options:
  --dry-run                 Preview only. This is the default.
  --execute                 Copy documents to the regional path.
  --verify                  Compare old and regional payloads without writing.
  --overwrite               Overwrite existing destination documents.
  --region <id>             Region id. Default: aichi
  --service-account <path>  Firebase service account JSON path.
  --project-id <id>         Firebase project id. Usually read from the service account.
`);
}

async function loadFirebaseAdmin(serviceAccountPath) {
  let appModule;
  let firestoreModule;
  try {
    appModule = await import("firebase-admin/app");
    firestoreModule = await import("firebase-admin/firestore");
  } catch (error) {
    throw new Error("firebase-admin is not installed. Run: npm install --no-save firebase-admin");
  }

  if (!serviceAccountPath) {
    throw new Error("Service account is required. Pass --service-account or set GOOGLE_APPLICATION_CREDENTIALS.");
  }

  const serviceAccount = JSON.parse(await readTextFile(serviceAccountPath));
  const projectId = serviceAccount.project_id;
  if (!projectId) {
    throw new Error("Service account JSON does not contain project_id.");
  }

  if (!appModule.getApps().length) {
    appModule.initializeApp({
      credential: appModule.cert(serviceAccount),
      projectId,
    });
  }

  return {
    db: firestoreModule.getFirestore(),
    projectId,
  };
}

async function readTextFile(filePath) {
  const fs = await import("node:fs/promises");
  return fs.readFile(filePath, "utf8");
}

async function migrateDocument({ db, docId, regionId, execute, overwrite }) {
  const sourceRef = db.collection("sharedState").doc(docId);
  const destinationRef = db.collection("regions").doc(regionId).collection("sharedState").doc(docId);

  const sourceSnapshot = await sourceRef.get();
  if (!sourceSnapshot.exists) {
    return { docId, sourceExists: false, destinationExists: false, copied: false, skipped: true, payloadKeys: 0 };
  }

  const destinationSnapshot = await destinationRef.get();
  const sourceData = sourceSnapshot.data() || {};
  const payload = sourceData.payload && typeof sourceData.payload === "object" ? sourceData.payload : {};
  const payloadKeys = Object.keys(payload).length;

  if (destinationSnapshot.exists && !overwrite) {
    return { docId, sourceExists: true, destinationExists: true, copied: false, skipped: true, payloadKeys };
  }

  if (execute) {
    await destinationRef.set(sourceData);
  }

  return { docId, sourceExists: true, destinationExists: destinationSnapshot.exists, copied: execute, skipped: false, payloadKeys };
}

async function verifyDocument({ db, docId, regionId }) {
  const sourceSnapshot = await db.collection("sharedState").doc(docId).get();
  const destinationSnapshot = await db.collection("regions").doc(regionId).collection("sharedState").doc(docId).get();
  const sourceData = sourceSnapshot.exists ? (sourceSnapshot.data() || {}) : {};
  const destinationData = destinationSnapshot.exists ? (destinationSnapshot.data() || {}) : {};
  const sourcePayload = sourceData.payload && typeof sourceData.payload === "object" ? sourceData.payload : {};
  const destinationPayload = destinationData.payload && typeof destinationData.payload === "object" ? destinationData.payload : {};
  const sourceKeys = Object.keys(sourcePayload);
  const destinationKeys = Object.keys(destinationPayload);
  const missingInDestination = sourceKeys.filter((key) => !Object.hasOwn(destinationPayload, key));
  const extraInDestination = destinationKeys.filter((key) => !Object.hasOwn(sourcePayload, key));
  const changedKeys = sourceKeys.filter((key) => (
    Object.hasOwn(destinationPayload, key)
    && stableStringify(sourcePayload[key]) !== stableStringify(destinationPayload[key])
  ));

  return {
    docId,
    sourceExists: sourceSnapshot.exists,
    destinationExists: destinationSnapshot.exists,
    sourceKeys: sourceKeys.length,
    destinationKeys: destinationKeys.length,
    missingInDestination,
    extraInDestination,
    changedKeys,
    matches: sourceSnapshot.exists && destinationSnapshot.exists && !missingInDestination.length && !extraInDestination.length && !changedKeys.length,
  };
}

function stableStringify(value) {
  return JSON.stringify(sortJsonValue(value));
}

function sortJsonValue(value) {
  if (Array.isArray(value)) {
    return value.map(sortJsonValue);
  }
  if (value && typeof value === "object") {
    return Object.keys(value).sort().reduce((result, key) => {
      result[key] = sortJsonValue(value[key]);
      return result;
    }, {});
  }
  return value;
}

function printSummary({ options, projectId, results }) {
  console.log(`Project: ${projectId}`);
  console.log(`Region: ${options.regionId}`);
  console.log(`Mode: ${options.execute ? "EXECUTE" : "DRY-RUN"}`);
  console.log(`Overwrite: ${options.overwrite ? "yes" : "no"}`);
  console.log("");

  for (const result of results) {
    const source = result.sourceExists ? "source ok" : "source missing";
    const destination = result.destinationExists ? "destination exists" : "destination empty";
    const action = result.copied
      ? "copied"
      : (result.skipped ? "skipped" : (options.execute ? "not copied" : "would copy"));
    console.log(`${result.docId}: ${source}, ${destination}, payload keys=${result.payloadKeys}, ${action}`);
  }

  console.log("");
  if (!options.execute) {
    console.log("Dry-run only. Re-run with --execute to copy documents.");
  }
}

function printVerifySummary({ options, projectId, results }) {
  console.log(`Project: ${projectId}`);
  console.log(`Region: ${options.regionId}`);
  console.log("Mode: VERIFY");
  console.log("");

  for (const result of results) {
    const status = result.matches ? "match" : "DIFF";
    console.log(`${result.docId}: ${status}, source keys=${result.sourceKeys}, regional keys=${result.destinationKeys}`);
    if (!result.matches) {
      if (!result.sourceExists) console.log("  - source document missing");
      if (!result.destinationExists) console.log("  - regional document missing");
      if (result.missingInDestination.length) console.log(`  - missing in regional: ${result.missingInDestination.join(", ")}`);
      if (result.extraInDestination.length) console.log(`  - extra in regional: ${result.extraInDestination.join(", ")}`);
      if (result.changedKeys.length) console.log(`  - changed payload keys: ${result.changedKeys.join(", ")}`);
    }
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const { db, projectId } = await loadFirebaseAdmin(options.serviceAccountPath);
  if (options.projectId && options.projectId !== projectId) {
    throw new Error(`Project mismatch. Service account project is ${projectId}, but --project-id is ${options.projectId}.`);
  }

  if (options.verify) {
    const results = [];
    for (const docId of SHARED_DOC_IDS) {
      results.push(await verifyDocument({ db, docId, regionId: options.regionId }));
    }
    printVerifySummary({ options, projectId, results });
    if (results.some((result) => !result.matches)) {
      process.exitCode = 2;
    }
    return;
  }

  const results = [];
  for (const docId of SHARED_DOC_IDS) {
    results.push(await migrateDocument({
      db,
      docId,
      regionId: options.regionId,
      execute: options.execute,
      overwrite: options.overwrite,
    }));
  }

  printSummary({ options, projectId, results });
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
