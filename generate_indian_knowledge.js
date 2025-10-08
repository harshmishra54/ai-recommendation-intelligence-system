const fs = require('fs');

// Full list of Indian crops you provided
const indianCrops = [
  "Wheat", "Rice", "Maize", "Barley", "Sorghum", "Pearl millet", "Finger millet", "Bajra",
  "Cotton", "Sugarcane", "Soybean", "Groundnut", "Mustard", "Sunflower", "Sesame",
  "Potato", "Tomato", "Onion", "Chili", "Brinjal", "Cabbage", "Cauliflower", "Okra", "Pumpkin", "Bottle gourd",
  "Banana", "Mango", "Grapes", "Guava", "Papaya", "Orange", "Lemon", "Pomegranate",
  "Green gram", "Black gram", "Chickpea", "Lentil", "Pea",
  "Pigeon pea", "Jute", "Tea", "Coffee", "Rubber", "Coconut", "Cashew",
  "Turmeric", "Ginger", "Black Pepper", "Cardamom", "Clove", "Cinnamon", "Cumin", "Coriander", "Fenugreek",
  "Sweet Potato", "Tapioca", "Carrot", "Radish", "Beetroot",
  "Linseed", "Castor", "Safflower", "Niger seed",
  "Moth bean", "Horse gram", "Kidney bean", "Cowpea",
  "Litchi", "Pineapple", "Sapota", "Jamun", "Custard Apple",
  "Arhar", "Toor", "Lobia", "Rajma", "Mung bean", "Urad bean", "Masoor", 
  "Kodo Millet", "Foxtail Millet", "Proso Millet", "Barnyard Millet", "Browntop Millet",
  "Jowar", "Ragi", 
  "Hemp", "Mesta",
  "Arecanut", "Tobacco",
  "Garlic", "Kalonji", "Ajwain", "Bay leaf", "Nutmeg", "Mace", "Saffron",
  "Ridge gourd", "Bitter gourd", "Snake gourd", "Ash gourd", "Cluster bean", "French bean", "Spinach", "Methi", "Bathua",
  "Watermelon", "Muskmelon", "Fig", "Strawberry", "Plum", "Apricot", "Almond", "Walnut"
];

// Common agricultural problems
const problems = [
  { problem: "drought", symptoms: ["dry leaves","stunted growth","yellowing leaves"], advice: "Irrigate and use moisture-retaining practices." },
  { problem: "flooding", symptoms: ["waterlogged fields","root rot","yellowing leaves"], advice: "Improve drainage and treat roots." },
  { problem: "leaf rust", symptoms: ["orange pustules","yellowing leaves","leaf curling"], advice: "Apply fungicides and remove affected leaves." },
  { problem: "blight", symptoms: ["dark lesions","leaf drop","wilting"], advice: "Remove infected plant parts and treat soil." },
  { problem: "powdery mildew", symptoms: ["white powder on leaves","leaf curling","reduced yield"], advice: "Apply sulfur-based fungicides." },
  { problem: "aphid infestation", symptoms: ["sticky leaves","distorted growth"], advice: "Use neem oil or insecticidal soap." },
  { problem: "root nematodes", symptoms: ["galls on roots","poor nutrient uptake"], advice: "Use resistant varieties and nematicides." },
  { problem: "heat stress", symptoms: ["wilting","leaf scorch"], advice: "Provide shade and irrigation." },
  { problem: "cold stress", symptoms: ["leaf curling","stunted growth"], advice: "Use frost protection techniques." },
  { problem: "salinity", symptoms: ["leaf burn","stunted growth"], advice: "Improve soil drainage and use salt-tolerant varieties." },
  { problem: "nutrient deficiency", symptoms: ["pale leaves","poor growth"], advice: "Apply balanced NPK fertilizers." },
  { problem: "pest attack", symptoms: ["holes in leaves","leaf damage"], advice: "Monitor and use targeted insecticides." },
  { problem: "virus infection", symptoms: ["mosaic leaves","stunted growth"], advice: "Use virus-free seeds and control vectors." },
  { problem: "frost", symptoms: ["wilting","blackened leaves"], advice: "Protect plants with covers." },
  { problem: "hail damage", symptoms: ["torn leaves","broken stems"], advice: "Use protective netting or covers." }
];

// Random helper: pick 3–5 problems per crop
function randomProblems() {
  const num = 3 + Math.floor(Math.random() * 3);
  return problems.sort(() => 0.5 - Math.random()).slice(0, num);
}

// Generate knowledge base
const knowledgeBase = indianCrops.map(crop => ({
  crop,
  conditions: randomProblems().map(p => ({
    problem: p.problem,
    synonyms: [p.problem, p.problem + " issue", p.problem + " problem"],
    severity: ["low","medium","high"][Math.floor(Math.random()*3)],
    symptoms: p.symptoms,
    advice: p.advice,
    preventiveMeasures: ["Rotate crops", "Use resistant varieties", "Check soil regularly", "Maintain irrigation", "Soil testing"],
    seasonalTips: {
      spring: "Check weekly",
      summer: "Monitor daily",
      fall: "Inspect weekly",
      winter: "Protect plants"
    }
  }))
}));

// Save to JSON
fs.writeFileSync('knowledge_base_atlas.json', JSON.stringify(knowledgeBase, null, 2));
console.log(`✅ Generated ATLAS knowledge base with ${knowledgeBase.length} Indian crops!`);
