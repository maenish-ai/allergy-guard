const fs = require('fs');
const path = require('path');

const gradlePath = path.join(process.cwd(), 'android', 'app', 'build.gradle');
if (!fs.existsSync(gradlePath)) {
  throw new Error(`Android Gradle file not found: ${gradlePath}. Run expo prebuild first.`);
}

const required = [
  'ANDROID_KEYSTORE_PATH',
  'ANDROID_KEYSTORE_PASSWORD',
  'ANDROID_KEY_ALIAS',
  'ANDROID_KEY_PASSWORD',
];
const missing = required.filter((name) => !process.env[name]);
const allowDebugFallback = process.env.ALLOW_DEBUG_RELEASE_SIGNING === '1';

let gradle = fs.readFileSync(gradlePath, 'utf8');

if (missing.length && !allowDebugFallback) {
  throw new Error(
    `Stable Android release signing is not configured. Missing: ${missing.join(', ')}. ` +
      'Configure the GitHub signing secrets before creating a production/tag build.'
  );
}

if (!missing.length) {
  const signingMarker = /signingConfigs\s*\{[\s\S]*?debug\s*\{[\s\S]*?\n\s*\}\n\s*\}/m;
  const match = gradle.match(signingMarker);
  if (!match) {
    throw new Error('Could not locate signingConfigs.debug in android/app/build.gradle.');
  }

  const original = match[0];
  const injected = original.replace(/\n\s*\}\s*$/, `\n        release {\n            storeFile file(System.getenv("ANDROID_KEYSTORE_PATH"))\n            storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")\n            keyAlias System.getenv("ANDROID_KEY_ALIAS")\n            keyPassword System.getenv("ANDROID_KEY_PASSWORD")\n        }\n    }`);
  gradle = gradle.replace(original, injected);

  const signingLine = 'signingConfig signingConfigs.debug';
  const lastSigningIndex = gradle.lastIndexOf(signingLine);
  if (lastSigningIndex === -1) {
    throw new Error('Could not locate release signingConfig in android/app/build.gradle.');
  }
  gradle =
    gradle.slice(0, lastSigningIndex) +
    'signingConfig signingConfigs.release' +
    gradle.slice(lastSigningIndex + signingLine.length);
  fs.writeFileSync(gradlePath, gradle);
  console.log('Configured stable Android release signing from environment variables.');
} else {
  console.warn(
    'WARNING: using generated/default debug signing for this preview build. ' +
      'Do not publish this build and do not rely on it for long-term in-place updates.'
  );
}
