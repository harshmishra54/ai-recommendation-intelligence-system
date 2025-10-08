const express = require('express');
const bodyParser = require('body-parser');
const Fuse = require('fuse.js');
const products = require('./products_detailed.json');

const app = express();
app.use(bodyParser.json());

// Fuse.js options
const fuseOptions = {
  keys: ['cropDiseases.crop', 'cropDiseases.disease', 'productFeatures'],
  threshold: 0.6, // higher threshold for more flexible matching
  ignoreLocation: true,
};

// Helper: adjust dosage based on area, keeping units
function adjustDosage(dosage, area) {
  if (!dosage) return null;
  const match = dosage.toString().match(/([\d.]+)/);
  if (!match) return dosage;
  const value = parseFloat(match[1]);
  if (isNaN(value)) return dosage;
  const multiplied = value * parseFloat(area);
  return dosage.toString().replace(match[1], multiplied);
}

function adjustWaterVolume(volume, area) {
  if (!volume) return null;
  const str = volume.toString().trim();
  const match = str.match(/([\d.]+)/);
  if (!match) return str;
  const value = parseFloat(match[1]);
  if (isNaN(value)) return str;
  const multiplied = value * parseFloat(area);
  const unitMatch = str.match(/[a-zA-Z%]+/);
  const unit = unitMatch ? unitMatch[0] : 'L';
  return `${multiplied} ${unit}`.trim();
}

// Compute intelligent score for each product
function computeScore(item, cd, farmer, currentProducts) {
  let score = 0;

  // Season match
  if (item.seasons && item.seasons.includes(farmer.season)) score += 30;

  // Crop match (always required)
  if (cd.crop.toLowerCase().includes(farmer.crop.toLowerCase())) score += 30;

  // Disease match is optional
  if (farmer.disease && farmer.disease.toLowerCase() !== 'na') {
    if (cd.disease.toLowerCase().includes(farmer.disease.toLowerCase())) score += 20;
  }

  // Multi-disease bonus
  if (cd.disease.split(',').length > 1) score += 5;

  // Product features for productivity
  if (item.productFeatures) {
    const features = item.productFeatures.map(f => f.toLowerCase());
    if (features.includes('growth') || features.includes('yield') || features.includes('fertilizer') || features.includes('nutrition')) {
      score += 25; // high weight for productivity
    }
  }

  // Penalize already using product slightly
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

    // Search by crop only first
    let searchResults = fuse.search(crop).map(r => r.item);

    // Filter by disease only if provided
    if (disease && disease.toLowerCase() !== 'na') {
      searchResults = searchResults.filter(item =>
        item.cropDiseases.some(cd =>
          cd.disease.toLowerCase().includes(disease.toLowerCase())
        )
      );
    }

    searchResults.forEach(item => {
      item.cropDiseases.forEach(cd => {
        const cropMatch = cd.crop.toLowerCase().includes(crop.toLowerCase());
        if (cropMatch) {
          const { score, alreadyUsing } = computeScore(item, cd, { ...farmer, crop, disease }, currentProducts);

          recommendations.push({
            name: item.name,
            crop: cd.crop,
            disease: cd.disease,
            dosage: adjustDosage(cd.dosage, farmer.area),
            waterVolume: adjustWaterVolume(cd.waterVolume, farmer.area),
            season: farmer.season,
            area: farmer.area + " acres",
            alreadyUsing,
            directionsOfUse: item.directionsOfUse || 'Follow label instructions',
            product_url: item.product_url,
            image: item.image,
            features: item.productFeatures || [],
            reason: alreadyUsing
              ? `Farmer is already using this product. Consider alternatives for better productivity.`
              : `Recommended to improve ${crop} productivity and manage ${disease || 'general crop health'} during ${farmer.season}.`,
            score
          });
        }
      });
    });
  });

  // Sort and return top 5 recommendations
  recommendations.sort((a, b) => b.score - a.score);
  res.json({ recommendations: recommendations.slice(0, 5) });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Smart AI recommendation server running on http://localhost:${PORT}`);
});
