import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "fs";
import * as dotenv from "dotenv";

dotenv.config();
const apiKey = process.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
    console.error("No API key");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function run() {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const imgBuffer = fs.readFileSync("./public/Facture/Footer.png");
    const base64Data = imgBuffer.toString("base64");

    const prompt = `Extract all the text from this image exactly as it is, maintaining the layout (e.g. ICE: XXXX IF: XXXX RC: XXXX Company Name, Address, Phone, Email, etc.). Nothing else, just the text.`;

    const result = await model.generateContent([
        prompt,
        {
            inlineData: {
                data: base64Data,
                mimeType: "image/png"
            }
        }
    ]);
    console.log(result.response.text());
}
run();
