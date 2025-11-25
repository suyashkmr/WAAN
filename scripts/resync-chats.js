#!/usr/bin/env node
/**
 * Re-sync all chats to update participant names from contact cache.
 * Run this after updating relayManager.js to fix numeric participant IDs.
 */

const API_URL = process.env.WAAN_API_URL || 'http://localhost:3030';

async function resyncChats() {
    console.log('🔄 Re-syncing all chats to update participant names...\n');

    try {
        // Check relay status
        const statusRes = await fetch(`${API_URL}/relay/status`);
        if (!statusRes.ok) {
            throw new Error('Failed to get relay status. Is the server running?');
        }

        const status = await statusRes.json();

        if (status.status !== 'running') {
            console.error('❌ Relay is not running. Please start the relay first.');
            console.log('\nSteps:');
            console.log('1. Start the server: npm start');
            console.log('2. Connect the relay in the UI');
            console.log('3. Run this script again\n');
            process.exit(1);
        }

        console.log(`✅ Relay is running (${status.chatCount} chats available)`);
        console.log(`📞 Account: ${status.account?.pushName || 'Unknown'}\n`);

        // Trigger chat reload
        console.log('🔄 Triggering chat reload...');
        const reloadRes = await fetch(`${API_URL}/api/chats/reload`, {
            method: 'POST',
        });

        if (!reloadRes.ok) {
            throw new Error('Failed to reload chats');
        }

        console.log('✅ Chat reload initiated!\n');
        console.log('The relay will now:');
        console.log('1. Fetch all chats from WhatsApp');
        console.log('2. Update participant names using the contact cache');
        console.log('3. Save the updated data\n');
        console.log('⏳ This may take a few moments depending on the number of chats.');
        console.log('💡 Check the relay logs or UI for progress.\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.log('\nTroubleshooting:');
        console.log('- Ensure the server is running: npm start');
        console.log('- Check that the relay is connected');
        console.log(`- Verify API is accessible at ${API_URL}\n`);
        process.exit(1);
    }
}

resyncChats();
