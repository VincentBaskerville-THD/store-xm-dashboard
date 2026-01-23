import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';

interface DashboardPasswordDialogProps {
  open: boolean;
  onSuccess: () => void;
  password: string;
}

export function DashboardPasswordDialog({
  open,
  onSuccess,
  password: dashboardPassword,
}: DashboardPasswordDialogProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (password === dashboardPassword) {
      setError('');
      setPassword(''); 
      onSuccess();
    } else {
      setError('Incorrect password. Please try again.');
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Dashboard Access Required</DialogTitle>
          <DialogDescription>
            Enter the dashboard password to continue.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="dashboardPassword">Password</Label>
            <Input
              id="dashboardPassword"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter dashboard password"
              autoComplete="off"
              className={error ? 'border-red-500' : ''}
            />
            {error && (
              <p className="text-red-600 text-sm">{error}</p>
            )}
          </div>
          <div className="flex justify-end">
            <Button type="submit">Unlock Dashboard</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
