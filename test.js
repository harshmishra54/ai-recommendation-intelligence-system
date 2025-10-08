const axios = require('axios');

async function testRecommendation() {
  try {
    const response = await axios.post(
      'https://ai-recommendation-intelligence-system.onrender.com/recommend', // <-- add /recommend
      {
        farmer: {
          name: 'Rajiv',
          season: 'Kharif',
          area: 2
        },
        crops: [
          {
            name: 'Rice',
            disease: 'Blast',
            currentProducts: ['Indazole']
          },
          {
            name: 'Grapes',
            disease: 'Downey mildew',
            currentProducts: []
          }
        ]
      }
    );

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
