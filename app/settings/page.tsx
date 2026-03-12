"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { useState } from "react";

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    apiKey: "sk-proj-****",
    notifications: true,
    autoUpdate: true,
    darkMode: true,
    metricsRefresh: 10,
  });

  const handleSave = () => {
    toast.success("Settings saved successfully");
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-white mb-2">Settings</h1>
        <p className="text-slate-400">Manage your dashboard configuration and preferences</p>
      </div>

      <div className="space-y-6 max-w-2xl">
        {/* API Configuration */}
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">API Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-slate-300 mb-2 block">API Key</Label>
              <Input
                type="password"
                value={settings.apiKey}
                onChange={(e) =>
                  setSettings({ ...settings, apiKey: e.target.value })
                }
                className="bg-slate-800 border-slate-600 text-white"
              />
              <p className="text-xs text-slate-500 mt-1">
                Your API key is encrypted and never shared
              </p>
            </div>
            <div>
              <Label className="text-slate-300 mb-2 block">Metrics Refresh Interval (seconds)</Label>
              <Input
                type="number"
                min="5"
                max="300"
                value={settings.metricsRefresh}
                onChange={(e) =>
                  setSettings({ ...settings, metricsRefresh: parseInt(e.target.value) })
                }
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
          </CardContent>
        </Card>

        {/* Display Settings */}
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Display Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-slate-300">Dark Mode</Label>
              <Switch
                checked={settings.darkMode}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, darkMode: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-slate-300">Enable Notifications</Label>
              <Switch
                checked={settings.notifications}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, notifications: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* System Settings */}
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">System Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-slate-300">Auto-Update Agents</Label>
              <Switch
                checked={settings.autoUpdate}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, autoUpdate: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="bg-slate-900 border-red-900">
          <CardHeader>
            <CardTitle className="text-red-400">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="destructive" className="w-full">
              Reset Dashboard
            </Button>
            <Button variant="destructive" className="w-full">
              Clear All Data
            </Button>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex gap-4">
          <Button
            onClick={handleSave}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            <Save size={16} className="mr-2" />
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
