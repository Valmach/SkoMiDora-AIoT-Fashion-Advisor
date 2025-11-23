"use client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";


import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Settings as SettingsIcon, Palette } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Label } from "@/components/ui/label";

export default function SettingsPage() {
  return (
    <div className="container mx-auto max-w-3xl">
      {" "}
      {/* Removed p-4 sm:p-6 lg:p-8 as it's on main in layout */}
      <Card className="mb-8 shadow-lg">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <SettingsIcon className="h-7 w-7 text-accent" />
            <div>
              <CardTitle className="text-xl font-semibold text-foreground font-calligraphy">
                Application Settings
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Manage your preferences for SkoMiDora AIoT Fashion Advisor.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
      <div className="space-y-8">
        {/* Appearance Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center">
              <Palette className="mr-2 h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Appearance</CardTitle>
            </div>
            <CardDescription>
              Customize the look and feel of the application.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="theme-toggle-button" className="text-base">
                Theme
              </Label>
              <ThemeToggle />
            </div>
            <p className="text-sm text-muted-foreground">
              Other settings like profile management, notifications, and privacy
              will be re-integrated here.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
