const axios = require('axios');

async function testRecommendation() {
  try {
    const response = await axios.post('http://localhost:3000/recommend', {
      farmer: {
        name: 'Rajiv',
        season: 'Kharif',   // Season of cropping
        area: 2             // Area in acres
      },
      crops: [
        {
          name: 'Rice',
          disease: 'Blast',
          currentProducts: ['Indazole'] // Products farmer is already using
        },
        {
          name: 'Grapes',
          disease: 'Downey mildew',
          currentProducts: [] // Not using anything yet
        }
      ]
    });

    console.log('=== Smart AI Recommendations ===');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    if (error.response) {
      console.error('API Error:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Run the test
testRecommendation();
