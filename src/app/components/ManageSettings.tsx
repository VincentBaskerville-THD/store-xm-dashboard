import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { AdminTabNav } from './AdminTabNav';
import { Save, AlertCircle, CheckCircle2, Eye, EyeOff, Lock } from 'lucide-react';
import { Switch } from './ui/switch';

interface ManageSettingsProps {
  onNavigateBack: () => void;
  onNavigateHome?: () => void;
  onNavigateAllApps?: () => void;
  onNavigateKeyJourneys?: () => void;
  onNavigateTopPains?: () => void;
  onTabChange: (tab: 'manage-themes' | 'manage-top-pains' | 'manage-journeys' | 'manage-apps' | 'feature-flags' | 'settings') => void;
  dashboardAuthEnabled: boolean;
  dashboardPassword: string;
  onDashboardAuthEnabledChange: (enabled: boolean) => void;
  onDashboardPasswordChange: (password: string) => void;
  adminAuthEnabled: boolean;
  adminShowButton: boolean;
  adminPassword: string;
  onAdminAuthEnabledChange: (enabled: boolean) => void;
  onAdminShowButtonChange: (enabled: boolean) => void;
  onAdminPasswordChange: (password: string) => void;
}

export function ManageSettings({
  onNavigateBack,
  onNavigateHome,
  onNavigateAllApps,
  onNavigateKeyJourneys,
  onNavigateTopPains,
  onTabChange,
  dashboardAuthEnabled,
  dashboardPassword,
  onDashboardAuthEnabledChange,
  onDashboardPasswordChange,
  adminAuthEnabled,
  adminShowButton,
  adminPassword,
  onAdminAuthEnabledChange,
  onAdminShowButtonChange,
  onAdminPasswordChange,
}: ManageSettingsProps) {
  const [activeSection, setActiveSection] = useState<'dashboard' | 'admin'>('dashboard');
  const [dashboardCurrentPassword, setDashboardCurrentPassword] = useState('');
  const [dashboardNewPassword, setDashboardNewPassword] = useState('');
  const [dashboardConfirmPassword, setDashboardConfirmPassword] = useState('');
  const [dashboardShowCurrentPassword, setDashboardShowCurrentPassword] = useState(false);
  const [dashboardShowNewPassword, setDashboardShowNewPassword] = useState(false);
  const [dashboardShowConfirmPassword, setDashboardShowConfirmPassword] = useState(false);
  const [dashboardError, setDashboardError] = useState('');
  const [dashboardSuccess, setDashboardSuccess] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleDashboardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDashboardError('');
    setDashboardSuccess('');

    if (dashboardCurrentPassword !== dashboardPassword) {
      setDashboardError('Current password is incorrect');
      return;
    }

    if (dashboardNewPassword.length < 6) {
      setDashboardError('New password must be at least 6 characters long');
      return;
    }

    if (dashboardNewPassword !== dashboardConfirmPassword) {
      setDashboardError('New passwords do not match');
      return;
    }

    if (dashboardNewPassword === dashboardPassword) {
      setDashboardError('New password must be different from current password');
      return;
    }

    onDashboardPasswordChange(dashboardNewPassword);

    setDashboardSuccess('Password updated successfully!');
    setDashboardCurrentPassword('');
    setDashboardNewPassword('');
    setDashboardConfirmPassword('');

    setTimeout(() => setDashboardSuccess(''), 5000);
  };

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (currentPassword !== adminPassword) {
      setError('Current password is incorrect');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword === adminPassword) {
      setError('New password must be different from current password');
      return;
    }

    onAdminPasswordChange(newPassword);

    setSuccess('Password updated successfully!');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');

    setTimeout(() => setSuccess(''), 5000);
  };

  const handleReset = () => {
    setDashboardCurrentPassword('');
    setDashboardNewPassword('');
    setDashboardConfirmPassword('');
    setDashboardError('');
    setDashboardSuccess('');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
  };

  const navItems = [
    { id: 'portfolio', label: 'Portfolio', onClick: onNavigateHome || onNavigateBack },
    { id: 'all-apps', label: 'All Apps', onClick: onNavigateAllApps || onNavigateBack },
    { id: 'key-journeys', label: 'Key Journeys', onClick: onNavigateKeyJourneys || onNavigateBack },
    { id: 'top-pains', label: 'Top Pains', onClick: onNavigateTopPains || onNavigateBack },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 text-white" style={{ backgroundColor: '#ff6900' }}>
        {/* Navigation Tabs */}
        <nav className="border-b border-orange-700">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex gap-1">
              {navItems.map((item) => (
                <Button
                  key={item.id}
                  variant="ghost"
                  size="sm"
                  onClick={item.onClick}
                  className="rounded-none border-b-2 border-transparent px-4 py-3 transition-colors text-white/80 hover:bg-orange-700 hover:text-white"
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
        </nav>

        {/* Page Title Section */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Lock className="size-5" />
                <h1 className="font-semibold">Admin: Settings</h1>
              </div>
              <p className="text-sm text-white/80 mt-1">
                Manage system settings and security
              </p>
            </div>
          </div>
        </div>
      </header>

      <AdminTabNav activeTab="settings" onTabChange={onTabChange} />

      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex gap-2">
          <Button
            variant={activeSection === 'dashboard' ? 'default' : 'outline'}
            onClick={() => setActiveSection('dashboard')}
          >
            Dashboard Access
          </Button>
          <Button
            variant={activeSection === 'admin' ? 'default' : 'outline'}
            onClick={() => setActiveSection('admin')}
          >
            Admin Access
          </Button>
        </div>
        <Card className="p-6">
          {activeSection === 'dashboard' ? (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-semibold">Dashboard Access</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Require a password before anyone can access the dashboard.
                </p>
              </div>

              <div className="mb-6 grid gap-4 md:grid-cols-2">
                <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                  <div>
                    <p className="font-medium text-slate-900">Require dashboard password</p>
                    <p className="text-sm text-slate-600">Show the password prompt before accessing the dashboard.</p>
                  </div>
                  <Switch checked={dashboardAuthEnabled} onCheckedChange={onDashboardAuthEnabledChange} />
                </div>
              </div>

              {dashboardSuccess && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                  <CheckCircle2 className="size-5 text-green-600 flex-shrink-0" />
                  <p className="text-green-800">{dashboardSuccess}</p>
                </div>
              )}

              {dashboardError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                  <AlertCircle className="size-5 text-red-600 flex-shrink-0" />
                  <p className="text-red-800">{dashboardError}</p>
                </div>
              )}

              <form onSubmit={handleDashboardSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="dashboardCurrentPassword">
                    Current Password <span className="text-red-600">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="dashboardCurrentPassword"
                      type={dashboardShowCurrentPassword ? 'text' : 'password'}
                      value={dashboardCurrentPassword}
                      onChange={(e) => setDashboardCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      required
                      className="pr-10"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setDashboardShowCurrentPassword(!dashboardShowCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {dashboardShowCurrentPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dashboardNewPassword">
                    New Password <span className="text-red-600">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="dashboardNewPassword"
                      type={dashboardShowNewPassword ? 'text' : 'password'}
                      value={dashboardNewPassword}
                      onChange={(e) => setDashboardNewPassword(e.target.value)}
                      placeholder="Enter new password (min. 6 characters)"
                      required
                      minLength={6}
                      className="pr-10"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setDashboardShowNewPassword(!dashboardShowNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {dashboardShowNewPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-600">
                    Password must be at least 6 characters long
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dashboardConfirmPassword">
                    Confirm New Password <span className="text-red-600">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="dashboardConfirmPassword"
                      type={dashboardShowConfirmPassword ? 'text' : 'password'}
                      value={dashboardConfirmPassword}
                      onChange={(e) => setDashboardConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      required
                      minLength={6}
                      className="pr-10"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setDashboardShowConfirmPassword(!dashboardShowConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {dashboardShowConfirmPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleReset}
                    disabled={!dashboardCurrentPassword && !dashboardNewPassword && !dashboardConfirmPassword}
                  >
                    Reset Form
                  </Button>
                  <Button
                    type="submit"
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    <Save className="size-4 mr-2" />
                    Update Password
                  </Button>
                </div>
              </form>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-sm font-medium text-blue-900 mb-2">Password Requirements</h3>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>Minimum 6 characters</li>
                  <li>Must be different from current password</li>
                  <li>Current password is required to make changes</li>
                </ul>
                <p className="text-xs text-blue-700 mt-3">
                  <strong>Note:</strong> In a production environment, this password would be securely hashed and stored in a database.
                </p>
              </div>
              <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <h3 className="text-sm font-medium text-amber-900 mb-2">Demo Information</h3>
                <p className="text-sm text-amber-800">
                  Current dashboard password:{' '}
                  <code className="bg-amber-100 px-2 py-1 rounded font-mono">{dashboardPassword}</code>
                </p>
                <p className="text-xs text-amber-700 mt-2">
                  This demo indicator will be removed in production.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-semibold">Admin Access</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Manage the password used to access the admin panel.
                </p>
              </div>

              <div className="mb-6 grid gap-4 md:grid-cols-2">
                <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                  <div>
                    <p className="font-medium text-slate-900">Require admin password</p>
                    <p className="text-sm text-slate-600">Show the password prompt before accessing admin.</p>
                  </div>
                  <Switch checked={adminAuthEnabled} onCheckedChange={onAdminAuthEnabledChange} />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                  <div>
                    <p className="font-medium text-slate-900">Show admin shortcut button</p>
                    <p className="text-sm text-slate-600">Toggle the 👀 button in the top header.</p>
                  </div>
                  <Switch checked={adminShowButton} onCheckedChange={onAdminShowButtonChange} />
                </div>
              </div>

              {success && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                  <CheckCircle2 className="size-5 text-green-600 flex-shrink-0" />
                  <p className="text-green-800">{success}</p>
                </div>
              )}

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                  <AlertCircle className="size-5 text-red-600 flex-shrink-0" />
                  <p className="text-red-800">{error}</p>
                </div>
              )}

              <form onSubmit={handleAdminSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">
                    Current Password <span className="text-red-600">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      required
                      className="pr-10"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">
                    New Password <span className="text-red-600">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password (min. 6 characters)"
                      required
                      minLength={6}
                      className="pr-10"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showNewPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-600">
                    Password must be at least 6 characters long
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">
                    Confirm New Password <span className="text-red-600">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      required
                      minLength={6}
                      className="pr-10"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleReset}
                    disabled={!currentPassword && !newPassword && !confirmPassword}
                  >
                    Reset Form
                  </Button>
                  <Button
                    type="submit"
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    <Save className="size-4 mr-2" />
                    Update Password
                  </Button>
                </div>
              </form>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-sm font-medium text-blue-900 mb-2">Password Requirements</h3>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>Minimum 6 characters</li>
                  <li>Must be different from current password</li>
                  <li>Current password is required to make changes</li>
                </ul>
                <p className="text-xs text-blue-700 mt-3">
                  <strong>Note:</strong> In a production environment, this password would be securely hashed and stored in a database.
                </p>
              </div>

              <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <h3 className="text-sm font-medium text-amber-900 mb-2">Demo Information</h3>
                <p className="text-sm text-amber-800">
                  Current admin password: <code className="bg-amber-100 px-2 py-1 rounded font-mono">happyness</code>
                </p>
                <p className="text-xs text-amber-700 mt-2">
                  This demo indicator will be removed in production.
                </p>
              </div>
            </>
          )}
        </Card>
      </main>
    </div>
  );
}