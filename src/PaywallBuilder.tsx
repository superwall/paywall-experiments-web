import { useState, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Loader2, Plus, ArrowUp } from "lucide-react";
import Markdown from "react-markdown";
import ShinyText from "./components/ShinyText";
import { useTypingEffect } from "./hooks/useTypingEffect";

const MAX_IMAGES = 5;

const EXAMPLES = [
  {
    id: 1,
    title: "Example 1",
    image: "https://bepbjmwwfwlsrympfeug.supabase.co/storage/v1/object/public/paywalls/745089947/paywall-1761325244577.png",
    prompt: "Design a paywall experiment for brainly"
  },
  {
    id: 2,
    title: "Video Editor",
    image: "https://bepbjmwwfwlsrympfeug.supabase.co/storage/v1/object/public/paywalls/1191337894/paywall-1760367260143.png",
    prompt: "Design a paywall experiment for this video editing app"
  },
  {
    id: 3,
    title: "Perplexity",
    image: "https://bepbjmwwfwlsrympfeug.supabase.co/storage/v1/object/public/paywalls/1668000334/paywall-1754321860221.png",
    prompt: "Design a paywall experiment for this AI chat app"
  },
  {
    id: 4,
    title: "Headspace",
    image: "https://bepbjmwwfwlsrympfeug.supabase.co/storage/v1/object/public/paywalls/493145008/paywall-1760719086302.png",
    prompt: "Design a paywall experiment for this meditation app"
  },
  {
    id: 5,
    title: "ChatGPT",
    image: "https://bepbjmwwfwlsrympfeug.supabase.co/storage/v1/object/public/paywalls/6448311069/paywall-1757946074763.png",
    prompt: "Design a paywall experiment for this AI chat app"
  },
  {
    id: 6,
    title: "Evernote",
    image: "https://bepbjmwwfwlsrympfeug.supabase.co/storage/v1/object/public/paywalls/281796108/paywall-1750266886102.png",
    prompt: "Design a paywall experiment for this note-taking app"
  },
  {
    id: 7,
    title: "Pixelcut",
    image: "https://bepbjmwwfwlsrympfeug.supabase.co/storage/v1/object/public/paywalls/1534785237/paywall-1759940659559.png",
    prompt: "Design a paywall experiment for this AI image editing app"
  },
];

export function PaywallBuilder() {
  const [prompt, setPrompt] = useState("");
  const [uploadedImages, setUploadedImages] = useState<(File | string)[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [experimentData, setExperimentData] = useState<{
    title: string;
    hypothesis: string;
    variant: {
      change: string;
      reasoning: string;
    };
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Shuffle examples on mount
  const shuffledExamples = useMemo(() => {
    return [...EXAMPLES].sort(() => Math.random() - 0.5);
  }, []);

  const loadingMessages = [
    "Analyzing...",
    "Rewriting...",
    "Proofing...",
    "Tinkering...",
    "Generating...",
    "Optimizing..."
  ];
  const typingText = useTypingEffect(loadingMessages, 20, 20, 3000);

  const placeholderTexts = [
    "How can I update this paywall to increase ARPU?",
    "Based on your finding, which elements should be changed?",
    "What changes would you suggest to improve conversions?",
    "What modifications could reduce trial abandonment here?"
  ];
  const placeholderText = useTypingEffect(placeholderTexts, 20, 20, 4000);

  const processFiles = (files: File[]) => {
    const availableSlots = MAX_IMAGES - uploadedImages.length;
    const filesToAdd = files.slice(0, availableSlots);

    if (filesToAdd.length === 0) return;

    const newImages = [...uploadedImages, ...filesToAdd];
    setUploadedImages(newImages);

    // Create previews for new images
    filesToAdd.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    processFiles(files);
  };

  const handleRemoveImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter((file) =>
      file.type.startsWith("image/")
    );
    processFiles(files);
  };

  const handleSubmit = async () => {
    if (!prompt.trim() && uploadedImages.length === 0) return;

    console.log("[Frontend] Starting request...");
    console.log("[Frontend] Prompt:", prompt);
    console.log("[Frontend] Number of images:", uploadedImages.length);

    setIsLoading(true);
    setExperimentData(null);

    try {
      const formData = new FormData();
      formData.append("prompt", prompt);

      // Separate Files and URLs
      let fileIndex = 0;
      const imageUrls: string[] = [];

      uploadedImages.forEach((image) => {
        if (typeof image === 'string') {
          // It's a URL
          imageUrls.push(image);
        } else {
          // It's a File
          formData.append(`image${fileIndex}`, image);
          fileIndex++;
        }
      });

      // Add URLs as a JSON array
      if (imageUrls.length > 0) {
        formData.append("imageUrls", JSON.stringify(imageUrls));
      }

      console.log("[Frontend] Sending request to /api/generate");
      const response = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      });

      console.log("[Frontend] Response status:", response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("[Frontend] Response data:", data);

      if (data.error) {
        console.error("[Frontend] Error from server:", data.error);
        throw new Error(data.error);
      }

      if (data.title && data.hypothesis && data.variant) {
        console.log("[Frontend] Setting experiment data");
        setExperimentData(data);
      }
    } catch (error) {
      console.error("[Frontend] Error generating paywall:", error);
    } finally {
      console.log("[Frontend] Request completed, setting loading to false");
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleExampleClick = (example: typeof EXAMPLES[0]) => {
    setPrompt(example.prompt);
    // Replace all images with the example image
    setUploadedImages([example.image]);
    setImagePreviews([example.image]);
    // Optionally scroll to input
    // window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGenerateAnother = () => {
    setExperimentData(null);
    setPrompt("");
    setUploadedImages([]);
    setImagePreviews([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div
      className="min-h-screen bg-slate-50 flex flex-col items-center justify-between md:pt-[100px] p-4 pb-0 relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div></div>
      
      {/* Drag Overlay */}
      {isDragging && (
        <div className="absolute  transition-all inset-0 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <p className="text-black text-3xl mb-2">Drop screenshots here</p>
            <p className="text-black/40">Upload up to {MAX_IMAGES - uploadedImages.length} more image{MAX_IMAGES - uploadedImages.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      )}
      <div className="max-w-3xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          {/* Show uploaded images while loading */}
          {(isLoading || experimentData) && imagePreviews.length > 0 && (
            <div className={`${isLoading ? 'animate-pulse' : ''} flex justify-center gap-2 mb-10 flex-wrap relative`}>
              {imagePreviews.map((preview, index) => (
                <img
                  key={index}
                  src={preview}
                  alt={`Preview ${index + 1}`}
                  className={` w-[230px] ${index === 0 ? 'z-10' : 'absolute z-0 '} ${index === 1 ? '-translate-x-[30px] -rotate-[4deg] scale-[0.97]' : ''}  ${index === 2 ? 'translate-x-[30px] rotate-[4deg] scale-[0.97]' : ''}  rounded-2xl border border-[0.5px]`}
                />
              ))}
            </div>
          )}

          {!isLoading && (
            <div className="inline-flex items-center gap-2 bg-slate-900/5 border border-[0.5px] backdrop-blur-sm px-4 py-2 rounded-full mb-6 text-sm text-slate-600 ">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-left">Generate paywall experiments in seconds</span>
            </div>
          )}



          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-3 w-full min-h-[58px]">

            {isLoading ? <ShinyText
              text={typingText}
              disabled={false}
              speed={2}
              className="text-4xl mt-4"
            /> : experimentData ? experimentData.title : "Design a Paywall Experiment" }
          </h1>
    
        {!isLoading && (
          <p className="text-slate-600 md:text-lg">
            Based on 1000's of lessons from the team at <a className="text-brand-primary cursor-pointer underline " href="https://superwall.com">Superwall.com</a>
          </p>
        )}
        </div>

        {/* Response Display */}
        {experimentData && (
          <div className="mb-14 space-y-4">
            {/* Experiment Data */}
            <div className="!px-2 !pt-1 w-full bg-transparent text-slate-900 placeholder-slate-400 border-0 shadow-none resize-none text-lg mb-1 focus-visible:ring-0 min-h-20">
          

              {/* Hypothesis */}
              <div>
                <h4 className="text-slate-400 text-sm font-medium uppercase tracking-wider py-2">
                  Superwall's Hypothesis
                </h4>
                <div className="text-slate-900 text-lg prose prose-slate max-w-none prose-ul:list-disc prose-ul:pl-5 prose-ol:list-decimal prose-ol:pl-5 prose-li:my-1">
                  <Markdown>{experimentData.hypothesis}</Markdown>
                </div>
              </div>

              <div>
                <h4 className="text-slate-400 text-sm font-medium uppercase tracking-wider py-2">
                  Variant
                </h4>
                <div className="text-slate-900 text-lg prose prose-slate max-w-none prose-ul:list-disc prose-ul:pl-5 prose-ol:list-decimal prose-ol:pl-5 prose-li:my-1">
                  <Markdown>{experimentData.variant.change}</Markdown>
                </div>
              </div>


              <div>
                <h4 className="text-slate-400 text-sm font-medium uppercase tracking-wider py-2">
                  Reasoning
                </h4>
                <div className="text-slate-900 text-lg prose prose-slate max-w-none prose-ul:list-disc prose-ul:pl-5 prose-ol:list-decimal prose-ol:pl-5 prose-li:my-1">
                  <Markdown>{experimentData.variant.reasoning}</Markdown>
                </div>
              </div>
            </div>

            
          </div>
        )}

        {/* Input Box */}
        {!isLoading && !experimentData && (
          <div className="bg-white rounded-2xl border border-[0.5px] border-slate-200 p-3 shadow-lg shadow-slate-200/40">
          {/* Image Previews */}
          {imagePreviews.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-2">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="relative inline-block">
                  <img
                    src={preview}
                    alt={`Uploaded preview ${index + 1}`}
                    className="max-h-32 rounded-sm border border-slate-200"
                  />
                  <Button
                    onClick={() => handleRemoveImage(index)}
                    variant="secondary"
                    size="icon-sm"
                    className="absolute !p-0 !size-5 -top-0 -right-0 -translate-y-[40%] translate-x-[40%] rounded-full bg-white backdrop-blur-xl"
                  >
                    <X className="!w-3 !h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Text Input */}
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholderText}
            className="!px-2 !pt-1 w-full bg-transparent text-slate-900 placeholder-slate-400 border-0 shadow-none resize-none text-lg mb-1 focus-visible:ring-0 min-h-20"
            disabled={isLoading}
          />

          {/* Action Buttons */}
          <div className="flex items-end justify-between">
            <div className="flex items-center gap-3">
              {/* Photo Upload */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
              />
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900"
                disabled={uploadedImages.length >= MAX_IMAGES}
              >
                <label htmlFor="image-upload" className="cursor-pointer">
                  <Plus className="w-4 h-4" />
                  Screenshots
                </label>
              </Button>

            </div>


            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={isLoading || (!prompt.trim() && uploadedImages.length === 0)}
              size="icon-lg"
              variant={"default"}
              className="bg-brand-primary hover:scale-105 transition-all disabled:bg-brand-primary/50 disabled:opacity-50 rounded-full size-9 !p-0 text-white"
            >
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <ArrowUp className="!w-6 !h-6" />
              )}
            </Button>
          </div>
        </div>
        )}


      </div>

      {
        isLoading && (  <><div className="h-[15vh]"></div></>)
      }

{/* CTAs */}
            { !isLoading && experimentData && <div className="text-center w-full flex flex-col items-center justify-center mt-12 mb-24 px-4">
              
              <h2 className="text-3xl py-6 md:text-5xl font-bold max-w-[800px] w-full">It doesn't have to be a guessing game – launch this today.</h2>
              
              <div className="flex flex-col-reverse md:flex-row items-center gap-3 mt-6 justify-center">
             
              <Button
                onClick={handleGenerateAnother}
                size="xl"
                variant="outline"
                className="border-slate-200 text-slate-900 hover:bg-slate-50"
              >
                Try Another
              </Button>
               <Button
                asChild
                size="xl"
                className="bg-brand-primary hover:bg-brand-primary/90 text-white font-semibold"
              >
                <a href="https://superwall.com" target="_blank" rel="noopener noreferrer">
                  Visit Superwall → 
                </a>
              </Button>
            </div></div>}

      {/* Examples Footer */}
      {!isLoading && (
        <div className="bottom-0 left-0 right-0 bg-slate-50 pb-0 h-[240px] md:h-[400px] flex flex-col items-center justify-end ">
        <div className="md:pt-[120px] h-[180px] md:!h-[300px] md:hover:!h-[350px] ease-out !duration-[500ms] transition-all overflow-hidden !w-[100vw]">
          <div className="max-w-3xl mx-auto pt-32 scale-[60%] md:scale-100">
            {/* Fan-out cards container */}
            <div className="relative h-64 flex items-end justify-center">
              {shuffledExamples.map((example, index) => {
                // Position cards in pyramid: 4th on top, 3rd/5th middle, 2nd/6th bottom, 1st/7th far edges
                const positions: Array<{ rotate: number; translateY: number; left: number }> = [
                  { rotate: -24, translateY: 120, left: -360 }, // 1st: far far left, bottom
                  { rotate: -16, translateY: 80, left: -240 },  // 2nd: far left, bottom
                  { rotate: -8, translateY: 40, left: -120 },   // 3rd: left-center, middle
                  { rotate: 0, translateY: 0, left: 0 },        // 4th: center, top
                  { rotate: 8, translateY: 40, left: 120 },     // 5th: right-center, middle
                  { rotate: 16, translateY: 80, left: 240 },    // 6th: far right, bottom
                  { rotate: 24, translateY: 120, left: 360 },   // 7th: far far right, bottom
                ];

                const style = positions[index] || positions[0];

                return (
                  <button
                    key={example.id}
                    onClick={() => handleExampleClick(example)}
                    className="absolute bottom-0 w-56 rounded-t-xl bg-white shadow-md overflow-hidden transition-all duration-300 hover:scale-105 cursor-pointer group"
                    style={{
                      transform: `rotate(${style?.rotate}deg) translateY(${style?.translateY}px)`,
                      left: `calc(50% - 112px + ${style?.left}px)`,
                      zIndex: index === 3 ? 10 : Math.abs(index - 3) === 1 ? 5 : Math.abs(index - 3) === 2 ? 3 : 1,
                    }}
                  >
                    <img
                      src={example.image}
                      alt={example.title}
                      className="w-full h-auto object-contain "
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent flex items-end p-2">
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

export default PaywallBuilder;
