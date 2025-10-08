const express = require('express');
const bodyParser = require('body-parser');
const Fuse = require('fuse.js');
const fs = require('fs');

const knowledgeBase = JSON.parse(fs.readFileSync('knowledge_base_atlas.json'));
const products = JSON.parse(fs.readFileSync('products_detailed.json'));

const app = express();
app.use(bodyParser.json());

// Fuse.js options
const fuseOptions = {
  keys: ["crop", "conditions.problem", "conditions.symptoms", "conditions.advice"],
  threshold: 0.35,
  ignoreLocation: true
};

// Helpers
function adjustDosage(dosage, area) {
  if (!dosage || !area) return dosage;
  const match = dosage.toString().match(/([\d.]+)/);
  if (!match) return dosage;
  return dosage.toString().replace(match[1], parseFloat(match[1]) * parseFloat(area));
}

function adjustWaterVolume(volume, area) {
  if (!volume || !area) return volume;
  const match = volume.toString().match(/([\d.]+)/);
  if (!match) return volume;
  const unitMatch = volume.toString().match(/[a-zA-Z%]+/);
  const unit = unitMatch ? unitMatch[0] : 'L';
  return `${parseFloat(match[1]) * parseFloat(area)} ${unit}`;
}

function computeScore(item, cropProblem, farmer, currentProducts) {
  let score = 0;
  if (item.seasons?.includes(farmer.season)) score += 30;
  if ((cropProblem.crop || '').toLowerCase() === (farmer.crop || '').toLowerCase()) score += 30;
  if ((cropProblem.problem || '').toLowerCase() === (farmer.problem || '').toLowerCase()) score += 20;
  if ((cropProblem.problem || '').split(',').length > 1) score += 5;
  if (item.productFeatures?.some(f => ["growth","yield","fertilizer","nutrition"].includes(f.toLowerCase()))) score += 25;
  const alreadyUsing = currentProducts?.some(p => item.name.toLowerCase().includes(p.toLowerCase())) || false;
  if (!alreadyUsing) score += 5;
  return { score, alreadyUsing };
}

// Health check
app.get('/', (req, res) => {
  res.json({ status: '✅ Server running', message: 'POST /recommend with query & farmer info' });
});

// Recommendation endpoint
app.post('/recommend', (req, res) => {
  const { query = '', farmer = {}, currentProducts = [] } = req.body;
  const q = query.trim().toLowerCase();

  // 🌱 1️⃣ Small talk / chat responses
  const greetings = ["hi", "hello", "hey", "good morning", "good evening"];
  const gratitude = ["thanks", "thank you"];
  const who = ["who are you", "who made you", "what are you"];
  const help = ["help", "what can you do", "how to use"];
  const aboutProducts = ["what products", "show products", "list products", "available products"];
  const cropsQuery = ["what crops", "supported crops", "show crops", "which crops"];
  const dosageQuery = ["what is dosage", "dosage meaning", "explain dosage"];
  const waterVolumeQuery = ["what is water volume", "explain water volume", "meaning of water volume"];
  const companyQuery = ["who owns you", "parijat", "company info", "tell about company"];

  // ---- Chat Handling ----
  if (greetings.some(g => q === g)) {
    return res.json({
      query,
      message: "👋 Hello! I’m your Agri Assistant. Please tell me your crop and problem — for example, 'rice blast' or 'tomato leaf curl'.",
      recommendations: []
    });
  }

  if (gratitude.some(g => q.includes(g))) {
    return res.json({
      query,
      message: "😊 You’re most welcome! I'm here to assist you with crop protection and product recommendations.",
      recommendations: []
    });
  }

  if (who.some(w => q.includes(w))) {
    return res.json({
      query,
      message: "🤖 I’m your AI-powered Agriculture Advisor, developed to recommend Parijat Agrochemical products based on your crop and disease.",
      recommendations: []
    });
  }

  if (help.some(h => q.includes(h))) {
    return res.json({
      query,
      message:
        "🧭 You can ask things like:\n- 'Suggest product for wheat rust'\n- 'Rice blast treatment'\n- 'What is dosage?'\n- 'Show supported crops'",
      recommendations: []
    });
  }

  if (aboutProducts.some(a => q.includes(a))) {
    const allProducts = products.slice(0, 10).map(p => p.name);
    return res.json({
      query,
      message: `🧴 Here are some of our top products:\n${allProducts.join(", ")}\n\nYou can ask like 'Recommend for cotton bollworm' for specific help.`,
      recommendations: []
    });
  }

  if (cropsQuery.some(c => q.includes(c))) {
    const uniqueCrops = [
      ...new Set(products.flatMap(p => p.cropDiseases?.map(cd => cd.crop) || []))
    ].slice(0, 20);
    return res.json({
      query,
      message: `🌾 Supported crops include: ${uniqueCrops.join(", ")}.\n\nYou can ask like 'suggest for ${uniqueCrops[0]} disease'.`,
      recommendations: []
    });
  }

  if (dosageQuery.some(d => q.includes(d))) {
    return res.json({
      query,
      message:
        "💧 'Dosage' means the amount of product to use for a given area. For example, '500 ml per acre' means you should use 500 milliliters of the product for each acre of your field.",
      recommendations: []
    });
  }

  if (waterVolumeQuery.some(w => q.includes(w))) {
    return res.json({
      query,
      message:
        "🚿 'Water volume' means the amount of water needed to spray the chemical effectively. Example: '500 liters per acre' means mix the product in 500 liters of water for 1 acre area.",
      recommendations: []
    });
  }

  if (companyQuery.some(c => q.includes(c))) {
    return res.json({
      query,
      message:
        "🏢 Parijat Industries is one of India's leading agrochemical companies, providing crop protection solutions for Indian farmers since 1995. Learn more at https://parijat.in/",
      recommendations: []
    });
  }

  // 🌾 2️⃣ Recommendation Flow
  if (!query && !farmer.crop && !farmer.problem) {
    return res.json({
      message: "🪴 Please tell me your crop and problem, e.g. 'potato late blight' or 'wheat rust'.",
      recommendations: []
    });
  }

  // Search in knowledge base
  const fuse = new Fuse(knowledgeBase, fuseOptions);
  const searchResults = query ? fuse.search(query) : [];
  const bestMatch = searchResults.length
    ? searchResults[0].item
    : { crop: farmer.crop || '', conditions: [{ problem: farmer.problem || '', advice: '' }] };

  let condition = bestMatch.conditions?.[0] || {};
  if (bestMatch && query) {
    const conditionFuse = new Fuse(bestMatch.conditions, { keys: ['problem', 'symptoms', 'advice'], threshold: 0.35 });
    const conditionResult = conditionFuse.search(query);
    if (conditionResult.length) condition = conditionResult[0].item;
  }

  const cropToUse = bestMatch.crop || farmer.crop || '';
  const problemToUse = condition.problem || farmer.problem || '';

  const recommendations = [];
  products.forEach(item => {
    item.cropDiseases?.forEach(cd => {
      const cropMatch =
        cd.crop.toLowerCase().includes(cropToUse.toLowerCase()) ||
        cropToUse.toLowerCase().includes(cd.crop.toLowerCase());
      const diseaseMatch =
        cd.disease.toLowerCase().includes(problemToUse.toLowerCase()) ||
        problemToUse.toLowerCase().includes(cd.disease.toLowerCase());
      if (cropMatch && diseaseMatch) {
        const { score, alreadyUsing } = computeScore(item, { crop: cd.crop, problem: cd.disease }, farmer, currentProducts);
        recommendations.push({
          name: item.name,
          crop: cd.crop,
          disease: cd.disease,
          dosage: adjustDosage(cd.dosage, farmer.area || 1),
          waterVolume: adjustWaterVolume(cd.waterVolume, farmer.area || 1),
          season: farmer.season || 'Unknown',
          area: (farmer.area || 1) + ' acres',
          alreadyUsing,
          directionsOfUse: item.directionsOfUse || 'Follow label instructions',
          product_url: item.product_url,
          image: item.image,
          features: item.productFeatures || [],
          advice: condition.advice || 'Follow best agricultural practices',
          score
        });
      }
    });
  });

  recommendations.sort((a, b) => b.score - a.score);

  // 🧠 Fallback
  if (recommendations.length === 0) {
    return res.json({
      query,
      message:
        `🤔 I couldn’t find a specific product for "${query}". Please try again with crop and problem, like 'wheat rust' or 'paddy blast'.`,
      recommendations: []
    });
  }

  // ✅ Final Response
  res.json({
    query,
    interpretation: {
      crop: cropToUse || 'Unknown',
      problem: problemToUse || 'Unknown',
      advice: condition.advice || 'Follow best practices'
    },
    recommendations: recommendations.slice(0, 5)
  });
});


// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
