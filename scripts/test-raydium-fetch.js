const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function testRaydiumFetch() {
  try {
    const testMint = '3wPQhXYqy861Nhoc4bahtpf7G3e89XCLfZ67ptEfZUSA';
    
    console.log('Testing Raydium API fetch for:', testMint);
    
    const response = await fetch(
      `https://launch-mint-v1.raydium.io/get/by/mints?ids=${testMint}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      console.error('❌ HTTP error:', response.status, response.statusText);
      return;
    }

    const data = await response.json();
    console.log('✅ Response data:', JSON.stringify(data, null, 2));
    
    if (data.success && data.data?.rows && data.data.rows.length > 0) {
      const tokenData = data.data.rows[0];
      console.log('\n📋 Parsed token info:');
      console.log('- Name:', tokenData.name);
      console.log('- Symbol:', tokenData.symbol);
      console.log('- Logo:', tokenData.imgUrl);
      console.log('- Description:', tokenData.description);
      console.log('- Website:', tokenData.platformInfo?.web);
      console.log('- Platform:', tokenData.platformInfo?.name);
    } else {
      console.log('❌ No token data found or API error');
    }
    
  } catch (error) {
    console.error('❌ Error testing Raydium fetch:', error);
  }
}

testRaydiumFetch();