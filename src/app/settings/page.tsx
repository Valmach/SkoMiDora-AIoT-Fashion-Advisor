'use client';

import React, { useState } from 'react';
import { User, Calendar, Cpu, Settings2, ChevronRight, Moon, Volume2, Wifi } from 'lucide-react';
import { Playfair_Display } from 'next/font/google'; 

const playfair = Playfair_Display({ 
  subsets: ['latin'], 
  weight: ['400', '700', '900'],
  style: ['normal', 'italic']
});

export default function SettingsMenu() {
  const [activeTab, setActiveTab] = useState('profile');

  const settingsCategories = [
    { id: 'profile', icon: User, label: 'Profile & Preferences' },
    { id: 'integrations', icon: Calendar, label: 'Connected Accounts' },
    { id: 'hardware', icon: Cpu, label: 'Wardrobe Hardware' },
    { id: 'advanced', icon: Settings2, label: 'Advanced Diagnostics' },
  ];

  return (
    <div className="min-h-screen bg-black text-gray-200 p-8 flex flex-col md:flex-row gap-8">
      
      {/* Sidebar Navigation */}
      <div className="w-full md:w-64 flex flex-col gap-2">
        <h1 className={`${playfair.className} text-3xl text-white mb-6`}>Settings</h1>
        {settingsCategories.map((category) => (
          <button
            key={category.id}
            onClick={() => setActiveTab(category.id)}
            className={`flex items-center justify-between p-3 rounded-md transition-colors ${
              activeTab === category.id ? 'bg-red-900/20 border-l-2 border-red-700 text-white' : 'hover:bg-gray-900 text-gray-400'
            }`}
          >
            <div className="flex items-center gap-3">
              <category.icon size={18} />
              <span className="text-sm font-medium tracking-wider">{category.label}</span>
            </div>
            <ChevronRight size={16} className="opacity-50" />
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 max-w-3xl border border-gray-800 bg-gray-950/50 p-8 rounded-lg">
        
        {activeTab === 'profile' && (
          <div className="space-y-6 animate-in fade-in">
            <h2 className={`${playfair.className} text-2xl text-white border-b border-gray-800 pb-2`}>Preferences</h2>
            
            <div className="flex items-center justify-between py-2 border-b border-gray-800/50">
              <div>
                <h3 className="text-sm font-semibold text-white">Stylist Voice</h3>
                <p className="text-xs text-gray-500">Select the text-to-speech profile for event briefings</p>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-sm rounded-md hover:bg-gray-800">
                <Volume2 size={16} />
                UK English Female
              </button>
            </div>
            
            <div className="flex items-center justify-between py-2 border-b border-gray-800/50">
              <div>
                <h3 className="text-sm font-semibold text-white">Temperature Format</h3>
                <p className="text-xs text-gray-500">Choose between Celsius and Fahrenheit</p>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1 bg-red-900 text-white text-xs rounded-md">°C</button>
                <button className="px-3 py-1 bg-gray-900 text-gray-400 text-xs rounded-md">°F</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'integrations' && (
          <div className="space-y-6 animate-in fade-in">
            <h2 className={`${playfair.className} text-2xl text-white border-b border-gray-800 pb-2`}>Google Calendar</h2>
            <div className="flex items-center justify-between py-2">
              <div>
                <h3 className="text-sm font-semibold text-white">Sync Status</h3>
                <p className="text-xs text-green-500">Connected</p>
              </div>
              <button className="text-xs text-red-500 hover:text-red-400">Disconnect</button>
            </div>
          </div>
        )}

        {activeTab === 'hardware' && (
          <div className="space-y-6 animate-in fade-in">
            <h2 className={`${playfair.className} text-2xl text-white border-b border-gray-800 pb-2`}>Module Management</h2>
            
            <div className="flex items-center justify-between p-4 bg-gray-900/50 border border-gray-800 rounded-md">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-green-900/20 text-green-500 rounded-full">
                  <Wifi size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">SkoBox Module - Master Closet</h3>
                  <p className="text-xs text-gray-500">Status: Online | Battery: 87%</p>
                </div>
              </div>
              <button className="text-xs bg-gray-800 px-3 py-1 rounded hover:bg-gray-700 transition">Configure</button>
            </div>

            <button className="w-full py-3 border border-dashed border-gray-700 text-gray-400 rounded-md text-sm hover:border-red-700 hover:text-red-500 transition-colors">
              + Pair New BLE / Wi-Fi Module
            </button>
          </div>
        )}

      </div>
    </div>
  );
}