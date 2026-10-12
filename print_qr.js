const os = require('os');
const { spawn } = require('child_process');
const path = require('path');

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        if (iface.address.startsWith('10.') || iface.address.startsWith('192.168.') || iface.address.startsWith('172.')) {
          return iface.address;
        }
      }
    }
  }
  return '10.254.0.196';
}

const localIp = getLocalIp();
const port = 8080;
const defaultWebUrl = `http://${localIp}:${port}/`;

const mode = process.argv[2];

if (mode === 'expo') {
  console.log('\n======================================================');
  console.log('       🚀 STARTING EXPO GO METRO SERVER FOR HODI      ');
  console.log('======================================================\n');
  console.log('Scan the upcoming QR code with EXPO GO on Android or iOS camera.\n');
  
  const expoProcess = spawn('npx', ['expo', 'start'], {
    cwd: path.join(__dirname, 'expo_app'),
    stdio: 'inherit',
    shell: true
  });

  expoProcess.on('error', (err) => {
    console.error('Failed to start Expo:', err);
  });
} else {
  const url = mode || defaultWebUrl;
  try {
    const qrcode = require('qrcode-terminal');
    qrcode.generate(url, { small: true }, (qr) => {
      console.log('\n======================================================');
      console.log('       📱 HODI MOBILE ACCESS & EXPO GO QR CODE        ');
      console.log('======================================================\n');
      console.log(qr);
      console.log(`\nWi-Fi Network URL (Scan with Phone): ${url}`);
      console.log(`Localhost URL                      : http://localhost:${port}/`);
      console.log('\n------------------------------------------------------');
      console.log('📱 TO RUN IN EXPO GO:');
      console.log('   1. Open terminal: cd expo_app');
      console.log('   2. Run command  : npx expo start');
      console.log('   3. Scan Expo QR code with the Expo Go app!');
      console.log('======================================================\n');
    });
  } catch (e) {
    console.log('\n======================================================');
    console.log('       📱 HODI MOBILE ACCESS URLs                     ');
    console.log('======================================================\n');
    console.log(`  Wi-Fi Network URL (Phone): ${url}`);
    console.log(`  Localhost URL            : http://localhost:${port}/`);
    console.log('\n  Run Expo Go app          : cd expo_app && npx expo start');
    console.log('======================================================\n');
  }
}
