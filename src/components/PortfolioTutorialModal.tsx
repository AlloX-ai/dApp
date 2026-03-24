import { useState } from "react";
import { X, ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface TutorialStep {
  title: string;
  description: string;
  imageUrl: string;
}

const tutorialSteps: TutorialStep[] = [
  {
    title: "Login to AlloX",
    description: "Connect your wallet to AlloX platform using one of the supported wallets (MetaMask, Trust Wallet, WalletConnect, etc.)",
    imageUrl: "https://images.unsplash.com/photo-1614267119077-51bdcbf9f77a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3YWxsZXQlMjBjb25uZWN0aW9uJTIwY3J5cHRvY3VycmVuY3klMjBsb2dpbnxlbnwxfHx8fDE3NzQzNDkxMTh8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
  },
  {
    title: "Select Build Portfolio",
    description: "Navigate to the Trading section and click on 'Build Portfolio' to start creating your AI-powered narrative portfolio",
    imageUrl: "https://images.unsplash.com/photo-1771922748624-b205cf5d002d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYXNoYm9hcmQlMjB1c2VyJTIwaW50ZXJmYWNlJTIwZGVzaWdufGVufDF8fHx8MTc3NDM0OTEyNHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
  },
  {
    title: "Switch to BNB Chain Network",
    description: "You'll be prompted to switch your wallet network. Click the network switcher to proceed to the next step",
    imageUrl: "https://images.unsplash.com/photo-1631864031824-d636e1dc5292?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxibG9ja2NoYWluJTIwbmV0d29yayUyMHRlY2hub2xvZ3l8ZW58MXx8fHwxNzc0MzAwNzQ5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
  },
  {
    title: "Choose BNB Chain from Suggestions",
    description: "Select 'BNB Chain' from the network options and confirm the network switch in your wallet",
    imageUrl: "https://images.unsplash.com/photo-1670269069776-a1337c703669?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiaW5hbmNlJTIwYm5iJTIwY3J5cHRvY3VycmVuY3l8ZW58MXx8fHwxNzc0MzQ5MTE5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
  },
  {
    title: "Choose Type of Portfolio",
    description: "Select a narrative theme for your portfolio: Gaming, Metaverse, Prediction Markets, RWA, DeFi, AI, or other categories",
    imageUrl: "https://images.unsplash.com/photo-1653378972336-103e1ea62721?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpbnZlc3RtZW50JTIwY2F0ZWdvcmllcyUyMG9wdGlvbnN8ZW58MXx8fHwxNzc0MzQ5MTE5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
  },
  {
    title: "Choose the Amount",
    description: "Select your investment amount from the available options: $100, $250, $500, or $1000",
    imageUrl: "https://images.unsplash.com/photo-1574607383476-f517f260d30b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb25leSUyMGNhc2glMjBpbnZlc3RtZW50JTIwYW1vdW50fGVufDF8fHx8MTc3NDM0OTEyMHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
  },
  {
    title: "Choose Risk Tolerance",
    description: "Select your preferred risk level: High Market Cap (safer), Mid Market Cap (balanced), or Low Market Cap (higher risk/reward)",
    imageUrl: "https://images.unsplash.com/photo-1771931322109-180bb1b35bf8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyaXNrJTIwbWFuYWdlbWVudCUyMGFuYWx5c2lzfGVufDF8fHx8MTc3NDI2ODU5N3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
  },
  {
    title: "Choose Payment Token",
    description: "Select which token you want to use for payment: USDT, USDC, BNB, or other supported tokens",
    imageUrl: "https://images.unsplash.com/photo-1707075891530-30f9b3a6577c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjcnlwdG9jdXJyZW5jeSUyMHRva2VucyUyMGNvaW5zfGVufDF8fHx8MTc3NDM0OTEyMXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
  },
  {
    title: "Confirm and Execute",
    description: "Review your portfolio configuration and AI-selected tokens. Click 'Execute Portfolio' to begin the on-chain transaction process",
    imageUrl: "https://images.unsplash.com/photo-1634024520574-fba2c8167232?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb25maXJtJTIwdHJhbnNhY3Rpb24lMjBidXR0b258ZW58MXx8fHwxNzc0MzQ5MTIxfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
  },
  {
    title: "Confirm Each Token Transaction",
    description: "Approve each token swap transaction in your wallet. The AI will execute purchases for each selected token in your diversified portfolio",
    imageUrl: "https://images.unsplash.com/photo-1640032152000-f273e2ca6922?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxibG9ja2NoYWluJTIwdHJhbnNhY3Rpb24lMjBjb25maXJtYXRpb258ZW58MXx8fHwxNzc0MzQ5MTIxfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
  },
  {
    title: "All Set! Portfolio Created",
    description: "Success! Your diversified narrative portfolio has been created on-chain. You can now track your portfolio in the dashboard and compete in The Allocation Race",
    imageUrl: "https://images.unsplash.com/photo-1758518731027-78a22c8852ec?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdWNjZXNzJTIwY2VsZWJyYXRpb24lMjBhY2hpZXZlbWVudHxlbnwxfHx8fDE3NzQyNTM5Nzl8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
  },
];

interface PortfolioTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PortfolioTutorialModal({ isOpen, onClose }: PortfolioTutorialModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const currentStepData = tutorialSteps[currentStep];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center gap-3">
            
            <div>
              <h3 className="text-xl font-bold text-gray-900">Portfolio Creation Tutorial</h3>
              <p className="text-sm text-gray-600">Step {currentStep + 1} of {tutorialSteps.length}</p>
            </div>
          </div>
          <button
            className="text-gray-500 hover:text-gray-700 transition-colors"
            onClick={onClose}
          >
            <X size={24} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-gray-100">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-300"
            style={{ width: `${((currentStep + 1) / tutorialSteps.length) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Step Image */}
          <div className="relative w-full h-64 mb-6 rounded-xl overflow-hidden shadow-lg">
            <ImageWithFallback
              src={currentStepData.imageUrl}
              alt={currentStepData.title}
              className="w-full h-full object-cover"
            />
            {/* Step Number Badge */}
            <div className="absolute top-4 left-4 w-12 h-12 rounded-full bg-black flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">{currentStep + 1}</span>
            </div>
          </div>

          {/* Step Content */}
          <div className="space-y-4">
            <h4 className="text-2xl font-bold text-gray-900">
              {currentStepData.title}
            </h4>
            <p className="text-base text-gray-700 leading-relaxed">
              {currentStepData.description}
            </p>
          </div>

          {/* Step Indicators */}
          <div className="flex items-center justify-center gap-2 mt-8">
            {tutorialSteps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`transition-all duration-300 rounded-full ${
                  index === currentStep
                    ? 'w-8 h-2 bg-gradient-to-r from-blue-500 to-purple-600'
                    : index < currentStep
                    ? 'w-2 h-2 bg-blue-300'
                    : 'w-2 h-2 bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Footer - Navigation */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
              currentStep === 0
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:shadow-md'
            }`}
          >
            <ChevronLeft size={20} />
            Previous
          </button>

          {currentStep === tutorialSteps.length - 1 ? (
            <button
              onClick={onClose}
              className="px-8 py-3 rounded-xl font-semibold bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:shadow-lg transition-all"
            >
              Get Started
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold bg-black text-white hover:shadow-lg transition-all"
            >
              Next
              <ChevronRight size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
