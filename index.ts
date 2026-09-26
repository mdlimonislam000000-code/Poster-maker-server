import dotenv from "dotenv";
dotenv.config();
import express, { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import cors from "cors";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { GoogleGenAI } from "@google/genai";
import { Poster } from "./models/Poster";
import { Template } from "./models/Tamplate";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const geminiApiKey = process.env.GEMINI_API_KEY?.trim();

if (!geminiApiKey) {
  console.warn("⚠️ GEMINI_API_KEY is missing in .env");
}

const ai = new GoogleGenAI({
  apiKey: geminiApiKey || "",
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.warn("⚠️ MONGODB_URI is missing in .env");
}

async function generateAILayoutAndContent(formData: {
  name: string;
  designation: string;
  party: string;
  location: string;
  occasionType: string;
  headlineText: string;
}): Promise<{
  theme: string;
  primaryColor: string;
  secondaryColor: string;
  layoutStructure: string;
  model: string;
}> {
  console.log("🤖 Processing AI-assisted layout and theme configuration...");
  try {
    const prompt = `
Act as an expert Bangladeshi political poster designer.

Based on the following user details, output a JSON object containing the visual theme, color scheme and layout structure.

Details:
- Name: ${formData.name}
- Designation: ${formData.designation}
- Party: ${formData.party}
- Location: ${formData.location}
- Occasion: ${formData.occasionType}
- Headline: ${formData.headlineText}

Return ONLY valid JSON format with keys:
theme,
primaryColor,
secondaryColor,
layoutStructure.

No extra text or markdown formatting outside JSON.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });

    let textResult = response.text || "{}";

    textResult = textResult
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const jsonStartIndex = textResult.indexOf("{");
    const jsonEndIndex = textResult.lastIndexOf("}");

    if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
      textResult = textResult.substring(jsonStartIndex, jsonEndIndex + 1);
    }

    const parsed = JSON.parse(textResult);

    return {
      theme: parsed.theme || "patriotic-bangladeshi",
      primaryColor: parsed.primaryColor || "#006A4E",
      secondaryColor: parsed.secondaryColor || "#F42A41",
      layoutStructure: parsed.layoutStructure || "top-photos-bottom-footer",
      model: "gemini-2.0-flash",
    };
  } catch (error: any) {
    console.warn("⚠️ AI layout generation fallback triggered:", error?.message || error);

    return {
      theme: "standard-political",
      primaryColor: "#006A4E",
      secondaryColor: "#F42A41",
      layoutStructure: "standard",
      model: "fallback-safe-model",
    };
  }
}

app.get("/", (_req: Request, res: Response): void => {
  res.json({
    success: true,
    message: "AI Poster API is running",
  });
});

app.get("/api/templates", async (_req: Request, res: Response): Promise<void> => {
  try {
    const templates = await Template.find({ isActive: true }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: templates,
    });
  } catch (error: any) {
    console.error("❌ Get templates error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch templates",
    });
  }
});

app.get("/api/templates/user/:userId", async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    if (!userId) {
      res.status(400).json({
        success: false,
        message: "User ID is required",
      });
      return;
    }

    // ডেটাবেজ থেকে নির্দিষ্ট userId এর সব টেমপ্লেট খোঁজা (তৈরি হওয়ার উল্টো ক্রমানুসারে অর্থাৎ লেটেস্টগুলো আগে দেখাবে)
    const templates = await Template.find({ userId: userId.trim() }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: templates.length,
      message: "Templates fetched successfully",
      data: templates,
    });
  } catch (error: any) {
    console.error("❌ Get templates by user error:", error?.message || error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to fetch templates",
    });
  }
});

app.post("/api/templates", async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      title,
      userId,
      category,
      defaultHeadline,
      defaultSubHeadline,
      defaultDesc,
      borderColor,
      badgeBg,
      badgeText,
      accentColor,
      gradient,
      generatedImageUrl,
    } = req.body;

    const newTemplate = await Template.create({
      title: title ? title.trim() : "Untitled Template",
      userId: userId ? userId.trim() : "guest-user", 
      category: category ? category.trim() : "General",
      defaultHeadline: defaultHeadline ? defaultHeadline.trim() : "",
      defaultSubHeadline: defaultSubHeadline ? defaultSubHeadline.trim() : "",
      defaultDesc: defaultDesc ? defaultDesc.trim() : "",
      borderColor: borderColor || "#000000",
      badgeBg: badgeBg || "",
      badgeText: badgeText || "",
      accentColor: accentColor || "",
      gradient: gradient || "",
      generatedImageUrl: generatedImageUrl || "",
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: "Template created successfully",
      data: newTemplate,
    });
  } catch (error: any) {
    console.error("❌ Create template error:", error?.message || error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to create template",
    });
  }
});

app.delete("/api/templates/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id;
    const template = await Template.findByIdAndDelete(id);

    if (!template) {
      res.status(404).json({
        success: false,
        message: "Template not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Template deleted successfully",
    });
  } catch (error: any) {
    console.error("❌ Delete template error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete template",
    });
  }
});

app.post("/api/upload", upload.single("image"), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: "No image uploaded",
      });
      return;
    }

    console.log("📤 Uploading user photo to Cloudinary:", req.file.originalname);

    const result = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "ai-political-poster/uploads",
          resource_type: "image",
        },
        (error: any, result: any) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(result);
        }
      );

      stream.end(req.file!.buffer);
    });

    res.status(200).json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
    });
  } catch (error: any) {
    console.error("❌ Upload error:", error?.message || error);
    res.status(500).json({
      success: false,
      message: error?.message || "Image upload failed",
    });
  }
});

app.get("/api/posters", async (_req: Request, res: Response): Promise<void> => {
  try {
    const posters = await Poster.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: posters,
    });
  } catch (error: any) {
    console.error("❌ Get posters error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch posters",
    });
  }
});

app.get("/api/users/:userId/posters", async (req: Request, res: Response): Promise<void> => {
  try {
    const rawUserId = req.params.userId;

    if (typeof rawUserId !== "string" || !rawUserId.trim()) {
      res.status(400).json({
        success: false,
        message: "Valid userId is required",
      });
      return;
    }

    const userId = rawUserId.trim();
    const posters = await Poster.find({ userId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      userId,
      count: posters.length,
      data: posters,
    });
  } catch (error: any) {
    console.error("❌ Get user posters error:", error?.message || error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user posters",
    });
  }
});

app.get("/api/posters/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id;
    const poster = await Poster.findById(id);

    if (!poster) {
      res.status(404).json({
        success: false,
        message: "Poster not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: poster,
    });
  } catch (error: any) {
    console.error("❌ Get poster error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch poster",
    });
  }
});

app.post("/api/posters/generate", async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, name, designation, party, location, occasionType, headlineText, images } = req.body;

    if (typeof userId !== "string" || !userId.trim()) {
      res.status(400).json({ success: false, message: "Valid userId is required" });
      return;
    }
    if (typeof name !== "string" || !name.trim()) {
      res.status(400).json({ success: false, message: "Name is required" });
      return;
    }
    if (typeof occasionType !== "string" || !occasionType.trim()) {
      res.status(400).json({ success: false, message: "Occasion type is required" });
      return;
    }

    const cleanUserId = userId.trim();
    const cleanName = name.trim();
    const cleanDesignation = typeof designation === "string" ? designation.trim() : "";
    const cleanParty = typeof party === "string" ? party.trim() : "";
    const cleanLocation = typeof location === "string" ? location.trim() : "";
    const cleanOccasionType = occasionType.trim();
    const cleanHeadlineText = typeof headlineText === "string" ? headlineText.trim() : "";

    const aiConfig = await generateAILayoutAndContent({
      name: cleanName,
      designation: cleanDesignation,
      party: cleanParty,
      location: cleanLocation,
      occasionType: cleanOccasionType,
      headlineText: cleanHeadlineText,
    });

    const imageList = Array.isArray(images) ? images : [];
    const generatedImageUrl = imageList[0] || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop";

    const aiDesign = {
      background: aiConfig.theme,
      primaryColor: aiConfig.primaryColor,
      secondaryColor: aiConfig.secondaryColor,
      textColor: "#FFFFFF",
      headlineStyle: "bold",
      nameStyle: "bold",
      layout: aiConfig.layoutStructure,
      decoration: "clean-modern",
    };

    const poster = await Poster.create({
      userId: cleanUserId,
      name: cleanName,
      designation: cleanDesignation,
      party: cleanParty,
      location: cleanLocation,
      occasionType: cleanOccasionType,
      headlineText: cleanHeadlineText,
      images: imageList,
      generatedImageUrl,
      aiDesign,
      aiModel: aiConfig.model,
      status: "completed",
    });

    res.status(201).json({
      success: true,
      message: "Poster generated and saved successfully",
      data: {
        id: poster._id,
        userId: poster.userId,
        name: poster.name,
        designation: poster.designation,
        party: poster.party,
        location: poster.location,
        occasionType: poster.occasionType,
        headlineText: poster.headlineText,
        generatedImageUrl: poster.generatedImageUrl,
        images: poster.images,
        design: poster.aiDesign,
        aiModel: poster.aiModel,
        status: poster.status,
        createdAt: poster.createdAt,
      },
    });
  } catch (error: any) {
    console.error("❌ Poster generation error:", error?.message || error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to generate poster",
    });
  }
});

app.post("/api/posters/save", async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, formData, photos, createdAt } = req.body;

    if (typeof userId !== "string" || !userId.trim()) {
      res.status(400).json({ success: false, message: "Valid userId is required" });
      return;
    }
    if (!formData || typeof formData !== "object") {
      res.status(400).json({ success: false, message: "formData is required" });
      return;
    }

    const cleanUserId = userId.trim();
    const name = typeof formData.name === "string" ? formData.name.trim() : "";
    const designation = typeof formData.designation === "string" ? formData.designation.trim() : "";
    const party = typeof formData.party === "string" ? formData.party.trim() : "";
    const location = typeof formData.location === "string" ? formData.location.trim() : "";
    const occasionType = typeof formData.occasionType === "string" ? formData.occasionType.trim() : "";
    const headlineText = typeof formData.headlineText === "string" ? formData.headlineText.trim() : "";

    if (!name) {
      res.status(400).json({ success: false, message: "Name is required" });
      return;
    }
    if (!occasionType) {
      res.status(400).json({ success: false, message: "Occasion type is required" });
      return;
    }

    const imageList = Array.isArray(photos) ? photos : [];
    const primaryImage = imageList[0] || formData.photo || formData.imageUrl || "";

    const poster = await Poster.create({
      userId: cleanUserId,
      name,
      designation,
      party,
      location,
      occasionType,
      headlineText,
      images: imageList,
      generatedImageUrl: primaryImage,
      aiModel: "user-saved-poster",
      status: "completed",
      createdAt: createdAt ? new Date(createdAt) : new Date(),
    });

    res.status(201).json({
      success: true,
      message: "Poster saved successfully",
      data: {
        id: poster._id,
        userId: poster.userId,
        name: poster.name,
        occasionType: poster.occasionType,
        images: poster.images,
        generatedImageUrl: poster.generatedImageUrl,
        createdAt: poster.createdAt,
      },
    });
  } catch (error: any) {
    console.error("❌ Save poster error:", error?.message || error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to save poster",
    });
  }
});

app.delete("/api/posters/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id;
    const poster = await Poster.findByIdAndDelete(id);

    if (!poster) {
      res.status(404).json({
        success: false,
        message: "Poster not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Poster deleted successfully",
    });
  } catch (error: any) {
    console.error("❌ Delete poster error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete poster",
    });
  }
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

app.use((error: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("❌ Server error:", error);
  res.status(500).json({
    success: false,
    message: error?.message || "Internal server error",
  });
});

async function startServer() {
  try {
    if (!mongoUri) {
      throw new Error("MONGODB_URI is missing in .env");
    }

    await mongoose.connect(mongoUri);
    console.log("✅ MongoDB connected successfully");

    app.listen(Number(PORT), () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Server startup failed:", error);
    process.exit(1);
  }
}

startServer();