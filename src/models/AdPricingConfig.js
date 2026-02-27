import mongoose from "mongoose";
const Schema = mongoose.Schema;

const generatedPriceSchema = new Schema({
  ad_type: {
    type: String,
    enum: ["banner", "stamp"],
    required: true
  },
  slot_position: {
    type: Number,
    required: true
  },
  slot_name: {
    type: String,
    required: true
  },
  quarterly: {
    type: Number,
    required: true
  },
  half_yearly: {
    type: Number,
    required: true
  },
  yearly: {
    type: Number,
    required: true
  }
}, { _id: false });

const adPricingConfigSchema = new Schema({
  // Reference to AdTierMaster (A1, A2, A3)
  tier_id: {
    type: Schema.Types.ObjectId,
    ref: "AdTierMaster",
    required: true,
    unique: true
  },
  
  // Base prices for this tier (quarterly)
  banner1_quarterly_price: {
    type: Number,
    required: true,
    default: 10000
  },
  stamp1_quarterly_price: {
    type: Number,
    required: true,
    default: 5000
  },
  
  // Duration multipliers
  duration_multipliers: {
    quarterly: { type: Number, default: 1.0 },
    half_yearly: { type: Number, default: 1.8 },
    yearly: { type: Number, default: 3.2 }
  },
  
  // Banner slot position multipliers (% of Banner 1)
  banner_multipliers: {
    1: { type: Number, default: 1.00 },
    2: { type: Number, default: 0.80 },
    3: { type: Number, default: 0.65 },
    4: { type: Number, default: 0.50 }
  },
  
  // Stamp slot position multipliers (% of Stamp 1)
  stamp_multipliers: {
    1: { type: Number, default: 1.00 },
    2: { type: Number, default: 0.80 },
    3: { type: Number, default: 0.65 },
    4: { type: Number, default: 0.50 }
  },
  
  // Tier multipliers (for auto-cascading from base tier to other tiers)
  // Only stored in base tier (A1), used to calculate A2, A3 prices
  tier_multipliers: {
    A1: { type: Number, default: 1.00 },
    A2: { type: Number, default: 0.85 },
    A3: { type: Number, default: 0.70 }
  },
  
  // Whether this is the base tier (A1 typically)
  is_base_tier: {
    type: Boolean,
    default: false
  },
  
  // Auto-generated prices (8 entries: 4 banner + 4 stamp)
  generated_prices: [generatedPriceSchema],
  
  is_active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Pre-save hook to auto-generate prices
adPricingConfigSchema.pre('save', function(next) {
  this.generated_prices = generatePrices(this);
  next();
});

// Function to generate all prices
function generatePrices(config) {
  const prices = [];
  
  // Generate banner prices
  [1, 2, 3, 4].forEach(pos => {
    const basePrice = config.banner1_quarterly_price * (config.banner_multipliers[pos] || 1);
    prices.push({
      ad_type: 'banner',
      slot_position: pos,
      slot_name: `banner_${pos}`,
      quarterly: Math.round(basePrice * (config.duration_multipliers?.quarterly || 1)),
      half_yearly: Math.round(basePrice * (config.duration_multipliers?.half_yearly || 1.8)),
      yearly: Math.round(basePrice * (config.duration_multipliers?.yearly || 3.2))
    });
  });
  
  // Generate stamp prices
  [1, 2, 3, 4].forEach(pos => {
    const basePrice = config.stamp1_quarterly_price * (config.stamp_multipliers[pos] || 1);
    prices.push({
      ad_type: 'stamp',
      slot_position: pos,
      slot_name: `stamp_${pos}`,
      quarterly: Math.round(basePrice * (config.duration_multipliers?.quarterly || 1)),
      half_yearly: Math.round(basePrice * (config.duration_multipliers?.half_yearly || 1.8)),
      yearly: Math.round(basePrice * (config.duration_multipliers?.yearly || 3.2))
    });
  });
  
  return prices;
}

const AdPricingConfig = mongoose.model("AdPricingConfig", adPricingConfigSchema);
export default AdPricingConfig;
