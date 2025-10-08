const express = require('express');
const bodyParser = require('body-parser');
const Fuse = require('fuse.js');
const products = require('./products_detailed.json'); // Your detailed products JSON

const app = express();
app.use(bodyParser.json());

// 🔹 Fuzzy search options
const fuseOptions = {
  keys: ['cropDiseases.crop', 'cropDiseases.disease'],
  threshold: 0.4, // Adjust sensitivity (lower = stricter match)
  ignoreLocation: true
};

// 🔹 Helper: adjust dosage based on area
function adjustDosage(dosage, area) {
  const numericDosage = parseFloat(dosage);
  if (isNaN(numericDosage)) return dosage;
  return numericDosage * parseFloat(area);
}

// 🔹 Scoring function
function computeScore(item, cd, farmer, currentProducts) {
  let score = 0;

  // Season match
  if (item.seasons && item.seasons.includes(farmer.season)) score += 40;

  // Crop match (case-insensitive)
  if (cd.crop.toLowerCase() === farmer.crop.toLowerCase()) score += 30;

  // Disease match (case-insensitive)
  if (cd.disease.toLowerCase().includes(farmer.disease.toLowerCase())) score += 20;

  // Multi-disease coverage bonus
  if (cd.disease.split(',').length > 1) score += 5;

  // New product bonus
  const alreadyUsing = currentProducts
    ? currentProducts.some(p => item.name.toLowerCase().includes(p.toLowerCase()))
    : false;
  if (!alreadyUsing) score += 5;

  return { score, alreadyUsing };
}

// 🩺 Health check
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
    const { name: crop, disease, currentProducts = [] } = cropItem;
    const searchQuery = `${crop} ${disease}`.toLowerCase();

    // 🔹 Fuzzy search in products
    const searchResults = fuse.search(searchQuery);

    // If no results, try partial match
    if (searchResults.length === 0) {
      console.log(`No exact fuzzy match for: ${searchQuery}, trying crop-only search`);
      const cropResults = fuse.search(crop.toLowerCase());
      cropResults.forEach(({ item }) => searchResults.push({ item }));
    }

    searchResults.forEach(({ item }) => {
      item.cropDiseases.forEach(cd => {
        const cropMatch = cd.crop.toLowerCase().includes(crop.toLowerCase());
        const diseaseMatch = cd.disease.toLowerCase().includes(disease.toLowerCase());

        if (cropMatch && diseaseMatch) {
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
            features: item.productFeatures || [],
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

  // Return top 5 recommendations
  const topRecommendations = recommendations.slice(0, 5);

  res.json({ recommendations: topRecommendations });
});

// ✅ Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Smart AI recommendation server running on http://localhost:${PORT}`);
});
