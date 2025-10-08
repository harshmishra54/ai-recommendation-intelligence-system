const express = require('express');
const bodyParser = require('body-parser');
const Fuse = require('fuse.js');
const products = require('./products_detailed.json'); // your detailed product JSON

const app = express();
app.use(bodyParser.json());

// Fuzzy search setup
const fuseOptions = {
  keys: ['cropDiseases.crop', 'cropDiseases.disease'],
  threshold: 0.4,
};

// Helper: adjust dosage based on area
function adjustDosage(dosage, area) {
  const numericDosage = parseFloat(dosage);
  if (isNaN(numericDosage)) return dosage;
  return numericDosage * parseFloat(area);
}

// Intelligent scoring based on priorities
function computeScore(item, cd, farmer, currentProducts) {
  let score = 0;

  // Priority 1: season match
  if (item.seasons && item.seasons.includes(farmer.season)) score += 40;

  // Priority 2: crop match
  if (cd.crop.toLowerCase() === farmer.crop.toLowerCase()) score += 30;

  // Priority 3: disease match
  if (cd.disease.toLowerCase() === farmer.disease.toLowerCase()) score += 20;

  // Multi-disease coverage bonus
  if (cd.disease.split(',').length > 1) score += 5;

  // Optional intelligence: product already used (small tie-breaker)
  const alreadyUsing = currentProducts
    ? currentProducts.some(p => item.name.toLowerCase().includes(p.toLowerCase()))
    : false;
  if (!alreadyUsing) score += 5; // small bonus if new product

  return { score, alreadyUsing };
}

// 🩺 Root endpoint (for health check or browser visit)
app.get('/', (req, res) => {
  res.json({
    status: '✅ Smart AI Recommendation Server is running!',
    message: 'Use POST /recommend to get crop protection recommendations.',
  });
});

// 🌾 Recommendation endpoint
app.post('/recommend', (req, res) => {
  const { farmer, crops } = req.body;

  if (!farmer || !farmer.area || !farmer.season || !crops || !Array.isArray(crops) || crops.length === 0) {
    return res.status(400).json({ error: 'Farmer info and crops array are required' });
  }

  const recommendations = [];
  const fuse = new Fuse(products, fuseOptions);

  crops.forEach(cropItem => {
    const { name: crop, disease, currentProducts } = cropItem;

    const searchResults = fuse.search(`${crop} ${disease}`);
    searchResults.forEach(({ item }) => {
      item.cropDiseases.forEach(cd => {
        if (
          cd.crop.toLowerCase().includes(crop.toLowerCase()) &&
          cd.disease.toLowerCase().includes(disease.toLowerCase())
        ) {
          const { score, alreadyUsing } = computeScore(item, cd, { ...farmer, crop, disease }, currentProducts);

          recommendations.push({
            name: item.name,
            crop: cd.crop,
            disease: cd.disease,
            dosage: adjustDosage(cd.dosage, farmer.area),
            waterVolume: cd.waterVolume,
            season: farmer.season,
            area: farmer.area + " acres",
            alreadyUsing,
            directionsOfUse: item.directionsOfUse || 'Follow label instructions',
            product_url: item.product_url,
            image: item.image,
            features: item.productFeatures,
            reason: alreadyUsing
              ? `Farmer is already using this product for ${cd.disease} in ${cd.crop}. Consider alternatives.`
              : `Recommended for ${cd.disease} in ${cd.crop} during ${farmer.season}.`,
            score
          });
        }
      });
    });
  });

  // Sort by score descending → highest priority products first
  recommendations.sort((a, b) => b.score - a.score);

  // Optional: return top 5
  const topRecommendations = recommendations.slice(0, 5);

  res.json({ recommendations: topRecommendations });
});

// ✅ Use Render’s dynamic port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Smart AI recommendation server running on http://localhost:${PORT}`);
});
