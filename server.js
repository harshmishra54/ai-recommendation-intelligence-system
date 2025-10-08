const express = require('express');
const bodyParser = require('body-parser');
const Fuse = require('fuse.js');
const products = require('./products_detailed.json');

const app = express();
app.use(bodyParser.json());

const fuseOptions = {
  keys: ['cropDiseases.crop', 'cropDiseases.disease', 'productFeatures'],
  threshold: 0.4,
  ignoreLocation: true,
};

// Helper: adjust dosage based on area
function adjustDosage(dosage, area) {
  const numericDosage = parseFloat(dosage);
  if (isNaN(numericDosage)) return dosage;
  return numericDosage * parseFloat(area);
}

// Compute intelligent score
function computeScore(item, cd, farmer, currentProducts) {
  let score = 0;

  // Season match
  if (item.seasons && item.seasons.includes(farmer.season)) score += 40;

  // Crop match
  if (cd.crop.toLowerCase() === farmer.crop.toLowerCase()) score += 30;

  // Disease match
  if (farmer.disease && cd.disease.toLowerCase().includes(farmer.disease.toLowerCase())) score += 20;

  // Multi-disease coverage bonus
  if (cd.disease.split(',').length > 1) score += 5;

  // Productivity boosters (if product features include "growth", "yield", "fertilizer")
  if (item.productFeatures) {
    const features = item.productFeatures.map(f => f.toLowerCase());
    if (features.includes('growth') || features.includes('yield') || features.includes('fertilizer')) {
      score += 15;
    }
  }

  // Already used product tie-breaker
  const alreadyUsing = currentProducts
    ? currentProducts.some(p => item.name.toLowerCase().includes(p.toLowerCase()))
    : false;
  if (!alreadyUsing) score += 5;

  return { score, alreadyUsing };
}

// Health check
app.get('/', (req, res) => {
  res.json({
    status: '✅ Smart AI Recommendation Server is running!',
    message: 'POST /recommend with farmer details to get recommendations.',
  });
});

// Recommendation endpoint
app.post('/recommend', (req, res) => {
  const { farmer, crops } = req.body;

  if (!farmer || !farmer.area || !farmer.season || !crops || !Array.isArray(crops)) {
    return res.status(400).json({ error: 'Farmer info and crops array are required' });
  }

  const recommendations = [];
  const fuse = new Fuse(products, fuseOptions);

  crops.forEach(cropItem => {
    const { name: crop, disease, currentProducts = [] } = cropItem;

    // Search by crop + disease + features
    const query = `${crop} ${disease || ''}`.toLowerCase();
    let searchResults = fuse.search(query).map(r => r.item);

    // If no exact matches, fallback to crop-only or productivity boosters
    if (searchResults.length === 0) {
      searchResults = fuse.search(crop.toLowerCase()).map(r => r.item);
    }

    searchResults.forEach(item => {
      item.cropDiseases.forEach(cd => {
        // If crop matches or product is a productivity booster
        const cropMatch = cd.crop.toLowerCase().includes(crop.toLowerCase());
        const diseaseMatch = disease ? cd.disease.toLowerCase().includes(disease.toLowerCase()) : true;
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
              ? `Farmer is already using this product. Consider alternatives for better productivity.`
              : `Recommended to improve ${farmer.crop} productivity and manage ${disease || 'general crop health'} during ${farmer.season}.`,
            score
          });
        }
      });
    });
  });

  // Sort and return top recommendations
  recommendations.sort((a, b) => b.score - a.score);
  res.json({ recommendations: recommendations.slice(0, 5) });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Smart AI recommendation server running on http://localhost:${PORT}`);
});
