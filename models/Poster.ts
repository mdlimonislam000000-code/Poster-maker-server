import mongoose, { Schema, Document } from "mongoose";

export interface IPoster extends Document {
  userId?: mongoose.Types.ObjectId;

  name: string;
  designation?: string;
  party?: string;
  location?: string;

  occasionType: string;
  headlineText: string;

  images: string[];

  generatedImageUrl?: string;

  aiModel?: string;

  aiDesign?: {
    background: string;
    primaryColor: string;
    secondaryColor: string;
    textColor: string;
    headlineStyle: string;
    nameStyle: string;
    layout: string;
    decoration: string;
  };

  status:
    | "draft"
    | "generating"
    | "completed"
    | "failed";

  createdAt: Date;
}

const PosterSchema = new Schema<IPoster>(
  {
    // =========================
    // USER
    // =========================
    userId: {
  type: String,
  default: null,
  index: true,
},

    // =========================
    // BASIC INFORMATION
    // =========================
    name: {
      type: String,
      required: true,
      trim: true,
    },

    designation: {
      type: String,
      default: "",
      trim: true,
    },

    party: {
      type: String,
      default: "",
      trim: true,
    },

    location: {
      type: String,
      default: "",
      trim: true,
    },

    occasionType: {
      type: String,
      required: true,
      trim: true,
    },

    headlineText: {
      type: String,
      required: true,
      trim: true,
    },

    // =========================
    // UPLOADED IMAGES
    // =========================
    images: {
      type: [String],
      default: [],
    },

    // =========================
    // GENERATED IMAGE
    // =========================
    generatedImageUrl: {
      type: String,
      default: "",
    },

    // =========================
    // AI MODEL
    // =========================
    aiModel: {
      type: String,
      default: "",
    },

    // =========================
    // AI DESIGN
    // =========================
    aiDesign: {
      background: {
        type: String,
        default: "",
      },

      primaryColor: {
        type: String,
        default: "",
      },

      secondaryColor: {
        type: String,
        default: "",
      },

      textColor: {
        type: String,
        default: "",
      },

      headlineStyle: {
        type: String,
        default: "",
      },

      nameStyle: {
        type: String,
        default: "",
      },

      layout: {
        type: String,
        default: "",
      },

      decoration: {
        type: String,
        default: "",
      },
    },

    // =========================
    // STATUS
    // =========================
    status: {
      type: String,
      enum: [
        "draft",
        "generating",
        "completed",
        "failed",
      ],
      default: "completed",
    },

    // =========================
    // CREATED AT
    // =========================
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
);

export const Poster =
  mongoose.models.Poster ||
  mongoose.model<IPoster>("Poster", PosterSchema);