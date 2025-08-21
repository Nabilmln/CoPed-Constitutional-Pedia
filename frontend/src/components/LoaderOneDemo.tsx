import React from "react";
import { LoaderOne } from "@/components/ui/loader";

export function LoaderOneDemo() {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <LoaderOne />
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Loading...
      </p>
    </div>
  );
}

export function LoaderOneDemoWithText() {
  return (
    <div className="flex items-center space-x-3">
      <LoaderOne />
      <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
        Processing request...
      </span>
    </div>
  );
}

export function LoaderOneDemoCard() {
  return (
    <div className="max-w-sm mx-auto bg-white dark:bg-neutral-900 rounded-lg shadow-lg p-6">
      <div className="flex flex-col items-center space-y-4">
        <LoaderOne />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Loading Content
          </h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Please wait while we fetch your data...
          </p>
        </div>
      </div>
    </div>
  );
}
