import { Disclosure } from "@headlessui/react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";

export default function Header() {
  return (
    <header className="bg-secondary border-b border-gray-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <span className="text-2xl font-bold text-gray-900">🎲 BetM3</span>
          </div>
          <nav className="hidden sm:flex sm:space-x-8">
            <a className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 border-b-2 border-primary">
              Home
            </a>
          </nav>
          <div className="flex sm:hidden">
            <button
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-900 hover:text-gray-700 hover:bg-primaryLight focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
            >
              <span className="sr-only">Open main menu</span>
              <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

declare global {
  interface Window {
    ethereum: any;
  }
}
