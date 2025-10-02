
import React, { useState, useCallback, useRef } from 'react';
import { editImageWithReference } from './services/geminiService';
import { UploadIcon, ImageIcon, XCircleIcon, SparklesIcon } from './components/icons';

const INITIAL_PROMPT = `A beautiful young woman with long dark hair, featuring the exact facial features and structure from the reference image. She is wearing a loose-fitting, oversized orange linen button-down shirt with the top buttons open, and matching wide-leg pink linen trousers. She is seated gracefully on a dark wooden backless stool, facing slightly towards the camera. Her left leg is bent at the knee with her foot flat on the floor, and her right leg is crossed over her left. Her left arm is casually draped over her right knee, with her fingers gently intertwined, and her right arm is resting by her side, with her hand on her lap. She has a subtle, engaging gaze directly at the viewer. The background is a plain, textured, dark olive green or earthy brown wall, creating a simple, studio-like setting. The lighting is soft and diffused from the front-side, highlighting her features and the texture of her clothing, creating gentle shadows and even illumination. The photo is a realistic, high-resolution three-quarter body shot, with a slightly off-center composition and a soft background blur as if taken with a 85mm prime lens at f/2.8.`;

const App: React.FC = () => {
    const [prompt, setPrompt] = useState<string>(INITIAL_PROMPT);
    const [referenceImage, setReferenceImage] = useState<{ file: File, previewUrl: string } | null>(null);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.size > 4 * 1024 * 1024) { // 4MB limit
                setError("File is too large. Please upload an image under 4MB.");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setReferenceImage({ file, previewUrl: reader.result as string });
                setError(null);
            };
            reader.onerror = () => {
                setError("Failed to read the image file.");
            };
            reader.readAsDataURL(file);
        }
    };

    const clearReferenceImage = () => {
        setReferenceImage(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };
    
    const handleGenerateClick = useCallback(async () => {
        if (!referenceImage) {
            setError("Please upload a reference image first.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setGeneratedImage(null);

        try {
            const { previewUrl } = referenceImage;
            const parts = previewUrl.split(',');
            if (parts.length !== 2) {
                throw new Error("Invalid image data URL format.");
            }
            const base64Data = parts[1];
            const mimeTypeMatch = parts[0].match(/:(.*?);/);
            if (!mimeTypeMatch || !mimeTypeMatch[1]) {
                throw new Error("Could not determine image MIME type.");
            }
            const mimeType = mimeTypeMatch[1];
            
            const resultBase64 = await editImageWithReference(prompt, base64Data, mimeType);
            setGeneratedImage(`data:image/jpeg;base64,${resultBase64}`);

        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setIsLoading(false);
        }
    }, [prompt, referenceImage]);

    return (
        <div className="min-h-screen bg-gray-900 text-gray-200 font-sans p-4 sm:p-6 lg:p-8">
            <div className="container mx-auto max-w-7xl">
                <header className="text-center mb-8">
                    <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-500 pb-2">
                        AI Image Stylizer
                    </h1>
                    <p className="text-lg text-gray-400">
                        Generate a new image from a reference photo and a detailed prompt.
                    </p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Control Panel */}
                    <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-gray-700 flex flex-col gap-6">
                        <div>
                            <h2 className="text-2xl font-semibold mb-3 text-orange-300">1. Upload Reference Image</h2>
                            {referenceImage ? (
                                <div className="relative group">
                                    <img src={referenceImage.previewUrl} alt="Reference Preview" className="w-full h-auto max-h-80 object-contain rounded-lg shadow-md" />
                                    <button onClick={clearReferenceImage} className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-red-600/80 transition-all duration-200 opacity-0 group-hover:opacity-100">
                                        <XCircleIcon className="w-6 h-6" />
                                    </button>
                                </div>
                            ) : (
                                <div 
                                    className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-orange-400 hover:bg-gray-800 transition-colors"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <input type="file" accept="image/png, image/jpeg, image/webp" ref={fileInputRef} onChange={handleImageChange} className="hidden" />
                                    <div className="flex flex-col items-center justify-center text-gray-500">
                                        <UploadIcon className="w-12 h-12 mb-2" />
                                        <p className="font-semibold">Click to upload or drag & drop</p>
                                        <p className="text-sm">PNG, JPG, or WEBP (max 4MB)</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div>
                            <h2 className="text-2xl font-semibold mb-3 text-pink-400">2. Refine Your Prompt</h2>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                className="w-full h-64 p-4 bg-gray-900/70 border border-gray-700 rounded-lg resize-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors"
                                placeholder="Describe the image you want to create..."
                            />
                        </div>

                        <button
                            onClick={handleGenerateClick}
                            disabled={isLoading || !referenceImage}
                            className="w-full flex items-center justify-center gap-3 py-4 px-6 text-xl font-bold bg-gradient-to-r from-orange-500 to-pink-600 rounded-lg hover:from-orange-600 hover:to-pink-700 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 shadow-lg"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <SparklesIcon className="w-6 h-6" />
                                    Generate Image
                                </>
                            )}
                        </button>
                    </div>
                    
                    {/* Output Panel */}
                    <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-gray-700 flex flex-col items-center justify-center min-h-[40rem]">
                        <h2 className="text-2xl font-semibold mb-4 text-center">Generated Image</h2>
                        <div className="w-full h-full flex items-center justify-center bg-gray-900/50 rounded-lg aspect-square">
                            {isLoading && (
                                <div className="text-center">
                                    <svg className="animate-spin mx-auto h-12 w-12 text-orange-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <p className="mt-4 text-lg text-gray-400">The AI is painting your vision...</p>
                                </div>
                            )}
                            {error && (
                                <div className="text-center text-red-400 bg-red-900/50 p-4 rounded-lg">
                                    <p className="font-bold">Generation Failed</p>
                                    <p className="text-sm">{error}</p>
                                </div>
                            )}
                            {!isLoading && !error && generatedImage && (
                                <img src={generatedImage} alt="Generated result" className="object-contain w-full h-full rounded-lg shadow-2xl" />
                            )}
                            {!isLoading && !error && !generatedImage && (
                                <div className="text-center text-gray-500">
                                    <ImageIcon className="w-20 h-20 mx-auto mb-4" />
                                    <p>Your masterpiece will appear here.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default App;
