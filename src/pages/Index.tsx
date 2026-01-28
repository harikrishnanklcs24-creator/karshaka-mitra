import { useState, useRef } from "react";
import { Camera, Upload, Leaf, Languages, Send, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Kerala Districts
const KERALA_DISTRICTS = [
  "Thiruvananthapuram", "Kollam", "Pathanamthitta", "Alappuzha", "Kottayam",
  "Idukki", "Ernakulam", "Thrissur", "Palakkad", "Malappuram",
  "Kozhikode", "Wayanad", "Kannur", "Kasaragod"
];

// Crop Categories
const CROP_CATEGORIES = [
  { en: "Coconut", ml: "തെങ്ങ്" },
  { en: "Rubber", ml: "റബ്ബർ" },
  { en: "Banana", ml: "വാഴ" },
  { en: "Rice/Paddy", ml: "നെല്ല്" },
  { en: "Pepper", ml: "കുരുമുളക്" },
  { en: "Cardamom", ml: "ഏലം" },
  { en: "Vegetables", ml: "പച്ചക്കറികൾ" },
  { en: "Arecanut", ml: "അടയ്ക്ക" },
  { en: "Cashew", ml: "കശുമാവ്" },
  { en: "Coffee", ml: "കാപ്പി" },
  { en: "Tea", ml: "ചായ" },
  { en: "Ginger", ml: "ഇഞ്ചി" },
  { en: "Turmeric", ml: "മഞ്ഞൾ" },
  { en: "Tapioca", ml: "കപ്പ" },
  { en: "Mango", ml: "മാവ്" },
  { en: "Jackfruit", ml: "പ്ലാവ്" },
  { en: "Other", ml: "മറ്റുള്ളവ" },
];

// Translation mappings
const translations: Record<string, Record<string, string>> = {
  appTitle: { en: "Crop Doctor", ml: "വിള ഡോക്ടർ" },
  appSubtitle: { en: "AI-Powered Crop Issue Diagnosis", ml: "AI അധിഷ്ഠിത വിള പ്രശ്ന നിർണയം" },
  govText: { en: "For Kerala Farmers", ml: "കേരള കർഷകർക്കായി" },
  uploadImage: { en: "Upload Image", ml: "ചിത്രം അപ്‌ലോഡ് ചെയ്യുക" },
  capturePhoto: { en: "Capture Photo", ml: "ഫോട്ടോ എടുക്കുക" },
  or: { en: "or", ml: "അല്ലെങ്കിൽ" },
  imageSelected: { en: "Image Selected", ml: "ചിത്രം തിരഞ്ഞെടുത്തു" },
  describeIssue: { en: "Describe Your Crop Issue", ml: "നിങ്ങളുടെ വിളയുടെ പ്രശ്നം വിവരിക്കുക" },
  descriptionPlaceholder: { en: "E.g., Yellow spots on leaves, wilting plants, pest attack...", ml: "ഉദാ: ഇലകളിൽ മഞ്ഞ പാടുകൾ, ചെടികൾ വാടുന്നു, കീടാക്രമണം..." },
  selectDistrict: { en: "Select Your District", ml: "നിങ്ങളുടെ ജില്ല തിരഞ്ഞെടുക്കുക" },
  chooseDistrict: { en: "-- Choose District --", ml: "-- ജില്ല തിരഞ്ഞെടുക്കുക --" },
  selectCropCategory: { en: "Select Crop Category", ml: "വിള വിഭാഗം തിരഞ്ഞെടുക്കുക" },
  chooseCropCategory: { en: "-- Choose Crop --", ml: "-- വിള തിരഞ്ഞെടുക്കുക --" },
  getDiagnosis: { en: "Get AI Diagnosis", ml: "AI നിർണയം നേടുക" },
  analyzing: { en: "Analyzing...", ml: "വിശകലനം ചെയ്യുന്നു..." },
  diagnosisResult: { en: "Diagnosis Result", ml: "നിർണയ ഫലം" },
  problemType: { en: "Problem Type", ml: "പ്രശ്ന തരം" },
  riskLevel: { en: "Risk Level", ml: "അപകട നില" },
  high: { en: "High", ml: "ഉയർന്നത്" },
  medium: { en: "Medium", ml: "മിതമായ" },
  low: { en: "Low", ml: "കുറവ്" },
  possibleCause: { en: "Possible Cause", ml: "സാധ്യമായ കാരണം" },
  recommendedAction: { en: "Recommended Action", ml: "ശുപാർശ ചെയ്യുന്ന നടപടി" },
  preventiveMeasures: { en: "Preventive Measures", ml: "മുൻകരുതൽ നടപടികൾ" },
  errorOccurred: { en: "An error occurred. Please try again.", ml: "ഒരു പിശക് സംഭവിച്ചു. വീണ്ടും ശ്രമിക്കുക." },
  yourCropImage: { en: "Your Crop Image", ml: "നിങ്ങളുടെ വിള ചിത്രം" },
  provideImageOrDescription: { en: "Please provide an image or description", ml: "ദയവായി ഒരു ചിത്രമോ വിവരണമോ നൽകുക" },
};

const t = (key: string, lang: string): string => {
  return translations[key]?.[lang] || translations[key]?.en || key;
};

interface DiagnosisResult {
  problemType: string;
  riskLevel: "High" | "Medium" | "Low";
  possibleCause: string;
  recommendedAction: string;
  preventiveMeasures: string;
}

const Index = () => {
  const [language, setLanguage] = useState<"en" | "ml">("en");
  const [image, setImage] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [district, setDistrict] = useState("");
  const [cropCategory, setCropCategory] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === "en" ? "ml" : "en");
  };

  const analyzeWithAI = async () => {
    if (!image && !description) {
      setError(t("provideImageOrDescription", language));
      return;
    }

    setIsLoading(true);
    setError(null);
    setDiagnosis(null);

    try {
      let imageBase64 = null;
      let imageMimeType = null;

      if (image) {
        const parts = image.split(",");
        imageBase64 = parts[1];
        imageMimeType = parts[0].split(";")[0].split(":")[1];
      }

      const { data, error: fnError } = await supabase.functions.invoke("crop-diagnosis", {
        body: {
          description,
          district,
          cropCategory,
          language,
          imageBase64,
          imageMimeType,
        },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setDiagnosis(data.diagnosis);
    } catch (err) {
      console.error("Analysis Error:", err);
      setError(t("errorOccurred", language));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen bg-background ${language === "ml" ? "malayalam-text" : ""}`}>
      {/* Header */}
      <header className="bg-primary text-primary-foreground py-4 px-4 shadow-lg">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary-foreground/20 p-2 rounded-full">
              <Leaf className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold">{t("appTitle", language)}</h1>
              <p className="text-sm opacity-90">{t("govText", language)}</p>
            </div>
          </div>
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-2 bg-primary-foreground/20 hover:bg-primary-foreground/30 
                       px-4 py-2 rounded-lg transition-colors font-semibold"
          >
            <Languages className="w-5 h-5" />
            {language === "en" ? "മലയാളം" : "English"}
          </button>
        </div>
      </header>

      {/* Subtitle Banner */}
      <div className="bg-secondary py-3 px-4 text-center">
        <p className="text-secondary-foreground font-medium text-lg">
          {t("appSubtitle", language)}
        </p>
      </div>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto p-4 pb-8 space-y-6">
        {/* Image Upload Section */}
        <div className="farmer-card">
          <label className="farmer-label">{t("uploadImage", language)}</label>
          
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="farmer-btn-outline flex-1 flex items-center justify-center gap-3 py-4"
            >
              <Upload className="w-6 h-6" />
              {t("uploadImage", language)}
            </button>
            
            <span className="text-center text-muted-foreground self-center">
              {t("or", language)}
            </span>
            
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="farmer-btn-outline flex-1 flex items-center justify-center gap-3 py-4"
            >
              <Camera className="w-6 h-6" />
              {t("capturePhoto", language)}
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageUpload}
            className="hidden"
          />

          {image && (
            <div className="mt-4 p-3 bg-secondary rounded-lg flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-primary" />
              <span className="font-medium text-secondary-foreground">
                {t("imageSelected", language)}
              </span>
            </div>
          )}

          {image && (
            <div className="mt-4">
              <img 
                src={image} 
                alt="Crop" 
                className="w-full max-h-64 object-contain rounded-lg border-2 border-border"
              />
            </div>
          )}
        </div>

        {/* Description Input */}
        <div className="farmer-card">
          <label className="farmer-label">{t("describeIssue", language)}</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("descriptionPlaceholder", language)}
            rows={4}
            className="farmer-input resize-none"
          />
        </div>

        {/* Crop Category Selection */}
        <div className="farmer-card">
          <label className="farmer-label">{t("selectCropCategory", language)}</label>
          <select
            value={cropCategory}
            onChange={(e) => setCropCategory(e.target.value)}
            className="farmer-select"
          >
            <option value="">{t("chooseCropCategory", language)}</option>
            {CROP_CATEGORIES.map((crop) => (
              <option key={crop.en} value={crop.en}>
                {language === "en" ? crop.en : `${crop.ml} (${crop.en})`}
              </option>
            ))}
          </select>
        </div>

        {/* District Selection */}
        <div className="farmer-card">
          <label className="farmer-label">{t("selectDistrict", language)}</label>
          <select
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            className="farmer-select"
          >
            <option value="">{t("chooseDistrict", language)}</option>
            {KERALA_DISTRICTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-destructive font-medium">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={analyzeWithAI}
          disabled={isLoading || (!image && !description)}
          className="farmer-btn w-full flex items-center justify-center gap-3"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              {t("analyzing", language)}
            </>
          ) : (
            <>
              <Send className="w-6 h-6" />
              {t("getDiagnosis", language)}
            </>
          )}
        </button>

        {/* Diagnosis Results */}
        {diagnosis && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-bold text-center text-primary flex items-center justify-center gap-2">
              <Leaf className="w-7 h-7" />
              {t("diagnosisResult", language)}
            </h2>

            {image && (
              <div className="farmer-card">
                <p className="farmer-label mb-3">{t("yourCropImage", language)}</p>
                <img 
                  src={image} 
                  alt="Analyzed crop" 
                  className="w-full max-h-48 object-contain rounded-lg"
                />
              </div>
            )}

            <div className="diagnosis-card">
              <div className="diagnosis-section">
                <p className="diagnosis-title">{t("problemType", language)}</p>
                <p className="diagnosis-content font-semibold text-primary">
                  {diagnosis.problemType}
                </p>
              </div>

              <div className="diagnosis-section">
                <p className="diagnosis-title">{t("riskLevel", language)}</p>
                <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-bold ${
                  diagnosis.riskLevel === "High" 
                    ? "bg-red-500 text-white" 
                    : diagnosis.riskLevel === "Medium"
                    ? "bg-yellow-500 text-white"
                    : "bg-green-500 text-white"
                }`}>
                  {diagnosis.riskLevel === "High" 
                    ? t("high", language) 
                    : diagnosis.riskLevel === "Medium"
                    ? t("medium", language)
                    : t("low", language)}
                </span>
              </div>

              <div className="diagnosis-section">
                <p className="diagnosis-title">{t("possibleCause", language)}</p>
                <p className="diagnosis-content">{diagnosis.possibleCause}</p>
              </div>

              <div className="diagnosis-section">
                <p className="diagnosis-title">{t("recommendedAction", language)}</p>
                <p className="diagnosis-content whitespace-pre-line">
                  {diagnosis.recommendedAction}
                </p>
              </div>

              <div className="diagnosis-section">
                <p className="diagnosis-title">{t("preventiveMeasures", language)}</p>
                <p className="diagnosis-content whitespace-pre-line">
                  {diagnosis.preventiveMeasures}
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-secondary py-4 px-4 text-center">
        <p className="text-muted-foreground text-sm">
          {language === "en" 
            ? "Powered by Lovable AI • For Kerala Farmers" 
            : "Lovable AI പവർഡ് • കേരള കർഷകർക്കായി"}
        </p>
      </footer>
    </div>
  );
};

export default Index;
