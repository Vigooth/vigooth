import { Link } from "react-router-dom";
import { Navigation, CpcLayout } from "@vigooth/ui";

export function AboutPage() {
  return (
    <CpcLayout>
      <div className="flex flex-col h-full">
        <Navigation />

        <div className="p-8 flex-1 overflow-auto">
          <div className="text-center mb-8 border-b-2 border-cpc-green-500 pb-4">
            <div className="text-cpc-yellow-500 text-2xl font-bold">ABOUT</div>
            <div className="text-cpc-cyan-500 text-sm mt-2">VIGOOTH SYSTEM v1.0</div>
          </div>

          <div className="space-y-4 text-cpc-green-500">
            <p className="text-lg">
              Welcome to the Vigooth System - a retro-styled terminal interface inspired by the
              classic Amstrad CPC 6128.
            </p>

            <div className="mt-8 p-4 border border-cpc-magenta-900">
              <h2 className="text-cpc-yellow-500 text-xl mb-4">Features:</h2>
              <ul className="list-disc list-inside space-y-2">
                <li>CPC-style terminal interface</li>
                <li>Custom input components</li>
                <li>React Router navigation</li>
                <li>Tailwind CSS v4</li>
                <li>Storybook component library</li>
              </ul>
            </div>

            <div className="mt-8">
              <Link
                to="/"
                className="inline-block px-6 py-3 border-2 border-cpc-green-500 text-cpc-green-500 hover:bg-cpc-green-500 hover:text-cpc-grey-900 transition-colors"
              >
                &lt; BACK TO HOME
              </Link>
            </div>
          </div>
        </div>
      </div>
    </CpcLayout>
  );
}
