/**
 * Password Hashing Script
 * Usage: node scripts/hash-password.js <password>
 */

const bcrypt = require('bcryptjs');

async function hashPassword(password) {
  const saltRounds = 10;
  const hash = await bcrypt.hash(password, saltRounds);
  return hash;
}

const password = process.argv[2];

if (!password) {
  console.error('Usage: node scripts/hash-password.js <password>');
  process.exit(1);
}

hashPassword(password)
  .then(hash => {
    console.log('\nPassword:', password);
    console.log('Hashed:', hash);
    console.log('\nAdd this to .env.local:');
    console.log(`MASTER_PASSWORD="${hash}"`);
    console.log('\nOr use in franchise-accounts.json:');
    console.log(`"password": "${hash}"`);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
