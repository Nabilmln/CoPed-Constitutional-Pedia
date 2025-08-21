"use client";

import {
  LoaderOne,
  LoaderTwo,
  LoaderThree,
  LoaderFour,
  LoaderFive,
} from "@/components/ui/loader";

export default function LoaderDemoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Loading Components Demo
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Aceternity UI Loaders implemented in CoPed
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* LoaderOne */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <h3 className="text-xl font-semibold mb-4 text-center text-gray-900 dark:text-white">
              LoaderOne
            </h3>
            <div className="flex justify-center mb-4">
              <LoaderOne />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              Bouncing dots animation - Used in HeroSection
            </p>
          </div>

          {/* LoaderTwo */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <h3 className="text-xl font-semibold mb-4 text-center text-gray-900 dark:text-white">
              LoaderTwo
            </h3>
            <div className="flex justify-center mb-4">
              <LoaderTwo />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              Moving dots with collision effect
            </p>
          </div>

          {/* LoaderThree */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <h3 className="text-xl font-semibold mb-4 text-center text-gray-900 dark:text-white">
              LoaderThree
            </h3>
            <div className="flex justify-center mb-4">
              <LoaderThree />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              Lightning bolt path animation
            </p>
          </div>

          {/* LoaderFour */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <h3 className="text-xl font-semibold mb-4 text-center text-gray-900 dark:text-white">
              LoaderFour
            </h3>
            <div className="flex justify-center mb-4">
              <LoaderFour text="Loading..." />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              Glitch text effect with custom text
            </p>
          </div>

          {/* LoaderFive */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <h3 className="text-xl font-semibold mb-4 text-center text-gray-900 dark:text-white">
              LoaderFive
            </h3>
            <div className="flex justify-center mb-4">
              <LoaderFive text="Loading Data" />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              Text wave animation with custom message
            </p>
          </div>

          {/* Implementation Example */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <h3 className="text-xl font-semibold mb-4 text-center text-gray-900 dark:text-white">
              HeroSection Usage
            </h3>
            <div className="flex flex-col items-center justify-center space-y-4">
              <LoaderOne />
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                Initializing 3D Environment...
              </p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-500 text-center mt-4">
              As implemented in SplinePlaceholder
            </p>
          </div>
        </div>

        {/* Code Examples */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-8">
            Implementation Examples
          </h2>
          <div className="bg-gray-900 rounded-lg p-6 overflow-x-auto">
            <pre className="text-sm text-gray-300">
              {`// Import the loader
import { LoaderOne } from "@/components/ui/loader";

// Basic usage
<LoaderOne />

// With Suspense fallback
<Suspense
  fallback={
    <div className="flex flex-col items-center">
      <LoaderOne />
      <p>Loading...</p>
    </div>
  }
>
  <YourComponent />
</Suspense>

// With state management
const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  const timer = setTimeout(() => setIsLoading(false), 2000);
  return () => clearTimeout(timer);
}, []);

if (isLoading) {
  return (
    <div className="flex justify-center">
      <LoaderOne />
    </div>
  );
}`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
