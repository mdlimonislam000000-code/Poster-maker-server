import mongoose, { Schema, Document } from "mongoose";

export interface ITemplate extends Document {
  title: string;
  userId: string; // নতুন যোগ করা হয়েছে
  category: string;
  defaultHeadline: string;
  defaultSubHeadline?: string;
  defaultDesc?: string;
  borderColor: string;
  badgeBg: string;
  badgeText: string;
  accentColor: string;
  gradient: string;
  generatedImageUrl?: string; // যদি সেভ করতে চান
  isActive: boolean;
  createdAt: Date;
}

const TemplateSchema = new Schema<ITemplate>(
  {
    title: { type: String, required: true, trim: true },
    userId: { type: String, required: true, default: "guest-user", trim: true }, // নতুন যোগ করা হয়েছে
    category: { type: String, required: true, trim: true, index: true },
    defaultHeadline: { type: String, required: true, trim: true },
    defaultSubHeadline: { type: String, default: "", trim: true },
    defaultDesc: { type: String, default: "", trim: true },
    borderColor: { type: String, required: true },
    badgeBg: { type: String, required: true },
    badgeText: { type: String, required: true },
    accentColor: { type: String, required: true },
    gradient: { type: String, required: true },
    generatedImageUrl: { type: String, default: "" }, // ইমেজ ইউআরএল ফিল্ডটি রাখা ভালো
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Template =
  mongoose.models.Template ||
  mongoose.model<ITemplate>("Template", TemplateSchema);