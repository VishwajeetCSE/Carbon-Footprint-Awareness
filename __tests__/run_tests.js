const { execSync } = require('child_process');
const path = require('path');

console.log("=== Running CarbonTrack AI Tests discoverability wrapper (__tests__) ===");
try {
    const testPath = path.join(__dirname, '..', 'test.js');
    execSync(`node "${testPath}"`, { stdio: 'inherit' });
    console.log("=== Discoverability wrapper tests completed successfully! ===");
    process.exit(0);
} catch (e) {
    console.error("=== Discoverability wrapper tests failed! ===");
    process.exit(1);
}
