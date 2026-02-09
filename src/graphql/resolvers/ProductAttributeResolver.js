// src/graphql/resolvers/ProductAttributeResolver.js

import authenticate from "../../middlewares/auth.js";

export const Query = {
  getProductAttribute: authenticate(["admin", "superSeller", "seller"])(
    async (_, { id }, { models }) => {
      try {
        return await models.ProductAttribute.findById(id);
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  getAllProductAttributes: authenticate(["admin", "superSeller", "seller"])(
    async (_, args, { models }) => {
      try {
        return await models.ProductAttribute.find();
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  getGst: authenticate(["admin", "superSeller", "seller"])(
    async (_, { productAttributeId }, { models }) => {
      try {
        const productAttribute = await models.ProductAttribute.findById(
          productAttributeId
        );
        if (!productAttribute) {
          throw new Error("Product attribute not found");
        }

        return productAttribute.gst;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  getUnitType: authenticate(["admin", "superSeller", "seller"])(
    async (_, { productAttributeId }, { models }) => {
      try {
        const productAttribute = await models.ProductAttribute.findById(
          productAttributeId
        );
        if (!productAttribute) {
          throw new Error("Product attribute not found");
        }

        return productAttribute.unitType;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  getPriceType: authenticate(["admin", "superSeller", "seller"])(
    async (_, { productAttributeId }, { models }) => {
      try {
        const productAttribute = await models.ProductAttribute.findById(
          productAttributeId
        );
        if (!productAttribute) {
          throw new Error("Product attribute not found");
        }

        return productAttribute.priceType;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  getExtraCharge: authenticate(["admin", "superSeller", "seller"])(
    async (_, { productAttributeId }, { models }) => {
      try {
        const productAttribute = await models.ProductAttribute.findById(
          productAttributeId
        );
        if (!productAttribute) {
          throw new Error("Product attribute not found");
        }

        return productAttribute.extraCharge;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  getTransportCharge: authenticate(["admin", "superSeller", "seller"])(
    async (_, { productAttributeId }, { models }) => {
      try {
        const productAttribute = await models.ProductAttribute.findById(
          productAttributeId
        );
        if (!productAttribute) {
          throw new Error("Product attribute not found");
        }

        return productAttribute.transportCharge;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  getFinalPrice: authenticate(["admin", "superSeller", "seller"])(
    async (_, { productAttributeId }, { models }) => {
      try {
        const productAttribute = await models.ProductAttribute.findById(
          productAttributeId
        );
        if (!productAttribute) {
          throw new Error("Product attribute not found");
        }

        return productAttribute.finalPrice;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
};

export const Mutation = {
  createProductAttribute: authenticate(["admin"])(
    async (
      _,
      { gst, unitType, priceType, extraCharge, transportCharge, finalPrice },
      { models }
    ) => {
      try {
        const productAttribute = new models.ProductAttribute({
          gst,
          unitType,
          priceType,
          extraCharge,
          transportCharge,
          finalPrice,
        });

        return await productAttribute.save();
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  updateProductAttribute: authenticate(["admin"])(
    async (
      _,
      {
        id,
        gst,
        unitType,
        priceType,
        extraCharge,
        transportCharge,
        finalPrice,
      },
      { models }
    ) => {
      try {
        const productAttribute = await models.ProductAttribute.findById(id);
        if (!productAttribute) {
          throw new Error("Product attribute not found");
        }

        if (gst) {
          productAttribute.gst = gst;
        }
        if (unitType) {
          productAttribute.unitType = unitType;
        }
        if (priceType) {
          productAttribute.priceType = priceType;
        }
        if (extraCharge) {
          productAttribute.extraCharge = extraCharge;
        }
        if (transportCharge) {
          productAttribute.transportCharge = transportCharge;
        }
        if (finalPrice) {
          productAttribute.finalPrice = finalPrice;
        }

        return await productAttribute.save();
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  deleteProductAttribute: authenticate(["admin"])(
    async (_, { id }, { models }) => {
      try {
        const productAttribute = await models.ProductAttribute.findById(id);
        if (!productAttribute) {
          throw new Error("Product attribute not found");
        }

        await models.ProductAttribute.findByIdAndRemove(id);
        return "Product attribute deleted successfully";
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  createGst: authenticate(["admin"])(
    async (_, { productAttributeId, title, gstRate }, { models }) => {
      try {
        const productAttribute = await models.ProductAttribute.findById(
          productAttributeId
        );
        if (!productAttribute) {
          throw new Error("Product attribute not found");
        }

        productAttribute.gst.push({ title, gstRate });
        await productAttribute.save();

        return productAttribute.gst[productAttribute.gst.length - 1];
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  updateGst: authenticate(["admin"])(
    async (_, { productAttributeId, gstId, title, gstRate }, { models }) => {
      try {
        const productAttribute = await models.ProductAttribute.findById(
          productAttributeId
        );
        if (!productAttribute) {
          throw new Error("Product attribute not found");
        }

        const gst = productAttribute.gst.id(gstId);
        if (!gst) {
          throw new Error("GST not found");
        }

        if (title) {
          gst.title = title;
        }
        if (gstRate) {
          gst.gstRate = gstRate;
        }

        await productAttribute.save();

        return gst;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),

  deleteGst: authenticate(["admin"])(
    async (_, { productAttributeId, gstId }, { models }) => {
      try {
        const productAttribute = await models.ProductAttribute.findById(
          productAttributeId
        );
        if (!productAttribute) {
          throw new Error("Product attribute not found");
        }
        // Find the index of the gst object with the matching gstId
        const gstIndex = productAttribute.gst.findIndex(
          (gst) => gst._id.toString() === gstId
        );

        if (gstIndex === -1) {
          throw new Error("GST not found");
        }

        // Remove the gst object at the found index
        productAttribute.gst.splice(gstIndex, 1);
        await productAttribute.save();

        return "GST deleted successfully";
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  createUnitType: authenticate(["admin"])(
    async (_, { productAttributeId, title, symbol }, { models }) => {
      try {
        const productAttribute = await models.ProductAttribute.findById(
          productAttributeId
        );
        if (!productAttribute) {
          throw new Error("Product attribute not found");
        }

        productAttribute.unitType.push({ title, symbol });
        await productAttribute.save();

        return productAttribute.unitType[productAttribute.unitType.length - 1];
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  updateUnitType: authenticate(["admin"])(
    async (
      _,
      { productAttributeId, unitTypeID, title, symbol },
      { models }
    ) => {
      try {
        const productAttribute = await models.ProductAttribute.findById(
          productAttributeId
        );
        if (!productAttribute) {
          throw new Error("Product attribute not found");
        }

        const unitType = productAttribute.unitType.id(unitTypeID);
        if (!unitType) {
          throw new Error("unittype not found");
        }

        if (title) {
          unitType.title = title;
        }
        if (symbol) {
          unitType.symbol = symbol;
        }

        await productAttribute.save();

        return unitType;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),

  deleteUnitType: authenticate(["admin"])(
    async (_, { productAttributeId, unitTypeID }, { models }) => {
      try {
        const productAttribute = await models.ProductAttribute.findById(
          productAttributeId
        );
        if (!productAttribute) {
          throw new Error("Product attribute not found");
        }
        // Find the index of the unitType object with the matching unitTypeID
        const unitTypeIndex = productAttribute.unitType.findIndex(
          (unitType) => unitType._id.toString() === unitTypeID
        );

        if (unitTypeIndex === -1) {
          throw new Error("UnitType not found");
        }

        // Remove the unitType object at the found index
        productAttribute.unitType.splice(unitTypeIndex, 1);
        await productAttribute.save();

        return "UnitType deleted successfully";
      } catch (error) {
        throw new Error(error);
      }
    }
  ),

  createPriceType: authenticate(["admin"])(
    async (_, { productAttributeId, title, symbol }, { models }) => {
      try {
        const productAttribute = await models.ProductAttribute.findById(
          productAttributeId
        );
        if (!productAttribute) {
          throw new Error("Product attribute not found");
        }

        productAttribute.priceType.push({ title, symbol });
        await productAttribute.save();

        return productAttribute.priceType[
          productAttribute.priceType.length - 1
        ];
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  updatePriceType: authenticate(["admin"])(
    async (
      _,
      { productAttributeId, priceTypeID, title, symbol },
      { models }
    ) => {
      try {
        const productAttribute = await models.ProductAttribute.findById(
          productAttributeId
        );
        if (!productAttribute) {
          throw new Error("Product attribute not found");
        }

        const priceType = productAttribute.priceType.id(priceTypeID);
        if (!priceType) {
          throw new Error("priceType not found");
        }

        if (title) {
          priceType.title = title;
        }
        if (symbol) {
          priceType.symbol = symbol;
        }

        await productAttribute.save();

        return priceType;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),

  deletePriceType: authenticate(["admin"])(
    async (_, { productAttributeId, priceTypeID }, { models }) => {
      try {
        const productAttribute = await models.ProductAttribute.findById(
          productAttributeId
        );
        if (!productAttribute) {
          throw new Error("Product attribute not found");
        }
        // Find the index of the priceType object with the matching priceTypeID
        const priceTypeIndex = productAttribute.priceType.findIndex(
          (priceType) => priceType._id.toString() === priceTypeID
        );

        if (priceTypeIndex === -1) {
          throw new Error("PriceType not found");
        }

        // Remove the priceType object at the found index
        productAttribute.priceType.splice(priceTypeIndex, 1);
        await productAttribute.save();

        return "priceType deleted successfully";
      } catch (error) {
        throw new Error(error);
      }
    }
  ),

  createExtraCharge: authenticate(["admin"])(
    async (_, { productAttributeId, title }, { models }) => {
      try {
        const productAttribute = await models.ProductAttribute.findById(
          productAttributeId
        );
        if (!productAttribute) {
          throw new Error("Product attribute not found");
        }

        productAttribute.extraCharge.push({ title });
        await productAttribute.save();

        return productAttribute.extraCharge[
          productAttribute.extraCharge.length - 1
        ];
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  updateExtraCharge: authenticate(["admin"])(
    async (_, { productAttributeId, extraChargeID, title }, { models }) => {
      try {
        const productAttribute = await models.ProductAttribute.findById(
          productAttributeId
        );
        if (!productAttribute) {
          throw new Error("Product attribute not found");
        }

        const extraCharge = productAttribute.extraCharge.id(extraChargeID);
        if (!extraCharge) {
          throw new Error("extraCharge not found");
        }

        if (title) {
          extraCharge.title = title;
        }

        await productAttribute.save();

        return extraCharge;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),

  deleteExtraCharge: authenticate(["admin"])(
    async (_, { productAttributeId, extraChargeID }, { models }) => {
      try {
        const productAttribute = await models.ProductAttribute.findById(
          productAttributeId
        );
        if (!productAttribute) {
          throw new Error("Product attribute not found");
        }
        // Find the index of the extraCharge object with the matching extraChargeID
        const extraChargeIndex = productAttribute.extraCharge.findIndex(
          (extraCharge) => extraCharge._id.toString() === extraChargeID
        );

        if (extraChargeIndex === -1) {
          throw new Error("ExtraCharge not found");
        }

        // Remove the extraCharge object at the found index
        productAttribute.extraCharge.splice(extraChargeIndex, 1);
        await productAttribute.save();

        return "extraCharge deleted successfully";
      } catch (error) {
        throw new Error(error);
      }
    }
  ),

  createTransportCharge: authenticate(["admin"])(
    async (_, { productAttributeId, title }, { models }) => {
      try {
        const productAttribute = await models.ProductAttribute.findById(
          productAttributeId
        );
        if (!productAttribute) {
          throw new Error("Product attribute not found");
        }

        productAttribute.transportCharge.push({ title });
        await productAttribute.save();

        return productAttribute.transportCharge[
          productAttribute.transportCharge.length - 1
        ];
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  updateTransportCharge: authenticate(["admin"])(
    async (_, { productAttributeId, transportChargeID, title }, { models }) => {
      try {
        const productAttribute = await models.ProductAttribute.findById(
          productAttributeId
        );
        if (!productAttribute) {
          throw new Error("Product attribute not found");
        }

        const transportCharge =
          productAttribute.transportCharge.id(transportChargeID);
        if (!transportCharge) {
          throw new Error("transportCharge not found");
        }

        if (title) {
          transportCharge.title = title;
        }

        await productAttribute.save();

        return transportCharge;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),

  deleteTransportCharge: authenticate(["admin"])(
    async (_, { productAttributeId, transportChargeID }, { models }) => {
      try {
        const productAttribute = await models.ProductAttribute.findById(
          productAttributeId
        );
        if (!productAttribute) {
          throw new Error("Product attribute not found");
        }
        // Find the index of the transportCharge object with the matching transportChargeID
        const transportChargeIndex = productAttribute.transportCharge.findIndex(
          (transportCharge) =>
            transportCharge._id.toString() === transportChargeID
        );

        if (transportChargeIndex === -1) {
          throw new Error("TransportCharge not found");
        }

        // Remove the transportCharge object at the found index
        productAttribute.transportCharge.splice(transportChargeIndex, 1);

        await productAttribute.save();

        return "transportCharge deleted successfully";
      } catch (error) {
        throw new Error(error);
      }
    }
  ),

  createFinalPrice: authenticate(["admin"])(
    async (_, { productAttributeId, title }, { models }) => {
      try {
        const productAttribute = await models.ProductAttribute.findById(
          productAttributeId
        );
        if (!productAttribute) {
          throw new Error("Product attribute not found");
        }

        productAttribute.finalPrice.push({ title });
        await productAttribute.save();

        return productAttribute.finalPrice[
          productAttribute.finalPrice.length - 1
        ];
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
  updateFinalPrice: authenticate(["admin"])(
    async (_, { productAttributeId, finalPriceID, title }, { models }) => {
      try {
        const productAttribute = await models.ProductAttribute.findById(
          productAttributeId
        );
        if (!productAttribute) {
          throw new Error("Product attribute not found");
        }

        const finalPrice = productAttribute.finalPrice.id(finalPriceID);
        if (!finalPrice) {
          throw new Error("finalPrice not found");
        }

        if (title) {
          finalPrice.title = title;
        }

        await productAttribute.save();

        return finalPrice;
      } catch (error) {
        throw new Error(error);
      }
    }
  ),

  deleteFinalPrice: authenticate(["admin"])(
    async (_, { productAttributeId, finalPriceID }, { models }) => {
      try {
        const productAttribute = await models.ProductAttribute.findById(
          productAttributeId
        );
        if (!productAttribute) {
          throw new Error("Product attribute not found");
        }

        // Find the index of the finalPrice object with the matching finalPriceID
        const finalPriceIndex = productAttribute.finalPrice.findIndex(
          (finalPrice) => finalPrice._id.toString() === finalPriceID
        );

        if (finalPriceIndex === -1) {
          throw new Error("FinalPrice not found");
        }

        // Remove the finalPrice object at the found index
        productAttribute.finalPrice.splice(finalPriceIndex, 1);

        await productAttribute.save();

        return "finalPrice deleted successfully";
      } catch (error) {
        throw new Error(error);
      }
    }
  ),
};

export const ProductAttribute = {};
