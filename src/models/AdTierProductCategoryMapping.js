import mongoose from "mongoose";
const Schema = mongoose.Schema;

const adTierProductCategoryMappingSchema = new Schema(
  {
    ad_tier_id: { type: Schema.Types.ObjectId, ref: "AdTierMaster", required: true },
    category_ids: [{ type: Schema.Types.ObjectId, ref: "Category", required: true }],
  },
  { timestamps: true }
);

const AdTierProductCategoryMapping = mongoose.model(
  "AdTierProductCategoryMapping",
  adTierProductCategoryMappingSchema
);

export default AdTierProductCategoryMapping;
