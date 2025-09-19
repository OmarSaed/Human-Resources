#!/usr/bin/env node

/**
 * HRMS Password Hasher Utility
 * 
 * This script generates bcrypt hashes compatible with the HRMS auth service.
 * Use this to generate password hashes for the SQL insertion scripts.
 * 
 * Usage:
 *   node password-hasher.js "MyPassword123!"
 *   node password-hasher.js
 */

const bcrypt = require('bcryptjs');

// Default bcrypt rounds (matches HRMS auth service configuration)
const BCRYPT_ROUNDS = 12;

/**
 * Hash a password using bcrypt
 */
async function hashPassword(password) {
    try {
        const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);
        const hash = await bcrypt.hash(password, salt);
        return hash;
    } catch (error) {
        console.error('Error hashing password:', error.message);
        process.exit(1);
    }
}

/**
 * Verify a password against a hash
 */
async function verifyPassword(password, hash) {
    try {
        return await bcrypt.compare(password, hash);
    } catch (error) {
        console.error('Error verifying password:', error.message);
        return false;
    }
}

/**
 * Generate a secure random password
 */
function generateSecurePassword(length = 12) {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const allChars = lowercase + uppercase + numbers + symbols;

    let password = '';
    
    // Ensure at least one character from each category
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];
    
    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
        password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Main function
 */
async function main() {
    console.log('🔐 HRMS Password Hasher Utility\n');

    const args = process.argv.slice(2);
    let password = args[0];

    // If no password provided, generate one
    if (!password) {
        password = generateSecurePassword(12);
        console.log(`🎲 Generated secure password: ${password}`);
    }

    // Validate password strength
    if (password.length < 8) {
        console.error('❌ Password must be at least 8 characters long');
        process.exit(1);
    }

    // Hash the password
    console.log('⏳ Hashing password...');
    const hash = await hashPassword(password);

    // Verify the hash works
    const isValid = await verifyPassword(password, hash);
    
    if (isValid) {
        console.log('✅ Password hashed successfully!\n');
        console.log('📋 Details:');
        console.log(`   Password: ${password}`);
        console.log(`   Hash: ${hash}`);
        console.log(`   Length: ${hash.length} characters`);
        console.log(`   Rounds: ${BCRYPT_ROUNDS}`);
        
        console.log('\n📝 SQL Usage:');
        console.log(`   password,`);
        console.log(`   '${hash}',`);
        
        console.log('\n🔗 Copy this hash to your SQL script:');
        console.log(`'${hash}'`);
    } else {
        console.error('❌ Hash verification failed!');
        process.exit(1);
    }
}

// Handle dependencies
try {
    require.resolve('bcryptjs');
} catch (error) {
    console.error('❌ Missing dependency: bcryptjs');
    console.log('💡 Install it with: npm install bcryptjs');
    process.exit(1);
}

// Run the script
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { hashPassword, verifyPassword, generateSecurePassword };
