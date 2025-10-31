import { useState, useRef, useMemo, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Loader2, Plus, ArrowUp } from "lucide-react";
import ShinyText from "./components/ShinyText";
import { useTypingEffect } from "./hooks/useTypingEffect";
import type { ResultData } from "./types/result";
import { ExamplesFooter } from "./components/ExamplesFooter";
import { usePostHogTracking, POSTHOG_EVENTS } from "./utils/posthog";
import { getEmail } from "./utils/email";

const MAX_IMAGES = 5;

export function PaywallBuilder() {
  const location = useLocation();
  const navigate = useNavigate();
  const posthog = usePostHogTracking();
  const [prompt, setPrompt] = useState("");
  const [uploadedImages, setUploadedImages] = useState<(File | string)[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);


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

  // Handle editing from shared results and example clicks
  useEffect(() => {
    const editResult = location.state?.editResult as ResultData | undefined;
    const examplePrompt = location.state?.examplePrompt as string | undefined;
    const exampleImage = location.state?.exampleImage as string | undefined;
    
    if (editResult) {
      setPrompt(editResult.prompt);
      // Set images from result
      const imageUrls = editResult.images.map(img => img.url);
      setUploadedImages(imageUrls);
      setImagePreviews(imageUrls);
    } else if (examplePrompt && exampleImage) {
      setPrompt(examplePrompt);
      setUploadedImages([exampleImage]);
      setImagePreviews([exampleImage]);
    }
  }, [location.state]);

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

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    console.log("[Frontend] Starting request...");
    console.log("[Frontend] Prompt:", prompt);
    console.log("[Frontend] Number of images:", uploadedImages.length);

    setIsLoading(true);

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

      const data = await response.json() as { generatedOutput?: string; slug?: string; error?: string };
      console.log("[Frontend] Response data:", data);

      if (data.error) {
        console.error("[Frontend] Error from server:", data.error);
        throw new Error(data.error);
      }

      if (data.generatedOutput && data.slug) {
        console.log("[Frontend] Generation complete, redirecting to result page");
        
        // Track generation event
        if (posthog) {
          const email = getEmail();
          const imageCount = uploadedImages.length;
          
          posthog.capture(POSTHOG_EVENTS.GENERATION_COMPLETE, {
            prompt: prompt || '',
            image_count: imageCount,
            slug: data.slug,
            has_email: !!email,
          });
          
          // Identify user with email if available
          if (email) {
            posthog.identify(email, {
              email: email,
            });
          }
        }
        
        // Redirect to result page
        navigate(`/r/${data.slug}`);
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

  const handleExampleClick = (example: { prompt: string; image: string }) => {
    setPrompt(example.prompt);
    // Replace all images with the example image
    setUploadedImages([example.image]);
    setImagePreviews([example.image]);
  };



  return (
    <div
      className="min-h-screen overflow-hidden bg-slate-50 flex flex-col items-center justify-between pt-[64px] md:pt-[100px] pb-0 relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div></div>
      
      {/* Drag Overlay */}
      {isDragging && (
        <div className="absolute  transition-all inset-0 backdrop-blur-sm z-50 flex items-center justify-center pointer-events-none">
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
          {isLoading && imagePreviews.length > 0 && (
            <div className="animate-pulse flex justify-center gap-2 mb-10 flex-wrap relative">
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

          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-3 w-full min-h-[58px] px-4">
            {isLoading ? (
              <ShinyText
                text={typingText}
                disabled={false}
                speed={2}
                className="text-4xl mt-4"
              />
            ) : (
              "AI Powered Paywall Experiments"
            )}
          </h1>
    
          {!isLoading && (
            <p className="text-slate-600 md:text-lg px-4">
              Based on 1,824 lessons from 422 unique experiments run by <a className="text-brand-primary cursor-pointer underline " href="https://superwall.com">Superwall.com</a>
            </p>
          )}
        </div>

        <div className="px-4">

        {/* Input Box */}
        {!isLoading && (
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
      </div>

      {isLoading && <div className="h-[15vh]"></div>}

      {/* Examples Footer */}
      {!isLoading && <ExamplesFooter onExampleClick={handleExampleClick} />}
    </div>
  );
}

export default PaywallBuilder;
