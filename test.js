/**
 * test.js
 * Simple tester for Smart AI Recommendation API
 */

const axios = require('axios');

async function testRecommendation() {
  const testCases = [
    {
      title: "🌾 Wheat Rust (Rabi Season)",
      body: {
        query: "wheat rust",
        farmer: {
          name: "Rajiv",
          crop: "Wheat",
          problem: "Rust",
          area: 2,
          season: "Rabi"
        },
        currentProducts: ["GROWMAX"]
      }
    },
    {
      title: "🌽 Maize Blight (Kharif)",
      body: {
        query: "maize blight",
        farmer: {
          name: "Arjun",
          crop: "Maize",
          problem: "Blight",
          area: 3,
          season: "Kharif"
        },
        currentProducts: []
      }
    },
    {
      title: "🍅 Tomato leaf curl (Summer)",
      body: {
        query: "tomato leaf curl",
        farmer: {
          name: "Sita",
          crop: "Tomato",
          problem: "leaf curl",
          area: 1.5,
          season: "Summer"
        },
        currentProducts: []
      }
    },
    {
      title: "🥔 Potato late blight (Winter)",
      body: {
        query: "potato late blight",
        farmer: {
          name: "Vijay",
          crop: "Potato",
          problem: "Late blight",
          area: 4,
          season: "Winter"
        }
      }
    },
    {
      title: "🌾 Chat-style input (Loose query)",
      body: {
        query: "suggest for rice blast problem in 3 acre during kharif",
        farmer: {
          name: "Harish",
          area: 3,
          season: "Kharif"
        }
      }
    }
  ];

  for (const test of testCases) {
    console.log("\n==============================");
    console.log(`TEST CASE: ${test.title}`);
    console.log("==============================");

    try {
      const response = await axios.post('http://localhost:3000/recommend', test.body);
      console.log("✅ API Response:");
      console.log(JSON.stringify(response.data, null, 2));
    } catch (error) {
      if (error.response) {
        console.error("❌ API Error:", JSON.stringify(error.response.data, null, 2));
      } else {
        console.error("❌ Error:", error.message);
      }
    }

    await new Promise(resolve => setTimeout(resolve, 500)); // small delay
  }

  console.log("\n🎯 All test cases completed!");
}

// Run test
testRecommendation();
