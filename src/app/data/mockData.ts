import { AppData, JourneyData } from '../App';

export const mockApps: AppData[] = [
  { id: '1', name: '1Returns', overallScore: 79, scoreMoM: 2, easeOfUse: 4.1, usefulness: 4.2, responses: 234, trend: 'up', metricsSystem: 'pendo' },
  { id: '2', name: 'My View', overallScore: 87, scoreMoM: 8, easeOfUse: 4.5, usefulness: 4.6, responses: 512, trend: 'up', metricsSystem: 'pendo' },
  { id: '3', name: 'Order Up', overallScore: 66, scoreMoM: -5, easeOfUse: 3.2, usefulness: 3.5, responses: 289, trend: 'down', metricsSystem: 'pendo' },
  { id: '4', name: 'Specialty Design Tools', overallScore: 72, scoreMoM: 3, easeOfUse: 3.8, usefulness: 3.9, responses: 156, trend: 'up', metricsSystem: 'pendo' },
  { id: '5', name: 'Specialty Project tool', overallScore: 81, scoreMoM: 1, easeOfUse: 4.2, usefulness: 4.3, responses: 445, trend: 'up', metricsSystem: 'pendo' },
  { id: '6', name: 'Curbside', overallScore: 68, scoreMoM: -2, easeOfUse: 3.4, usefulness: 3.6, responses: 378, trend: 'down', metricsSystem: 'medallia' },
  { id: '7', name: 'Customer Assistance', overallScore: 75, scoreMoM: 4, easeOfUse: 3.9, usefulness: 4.0, responses: 321, trend: 'up', metricsSystem: 'medallia' },
  { id: '8', name: 'Engage', overallScore: 70, scoreMoM: 0, easeOfUse: 3.6, usefulness: 3.7, responses: 267, trend: 'stable', metricsSystem: 'medallia' },
  { id: '9', name: 'Freight Management', overallScore: 83, scoreMoM: 5, easeOfUse: 4.3, usefulness: 4.4, responses: 198, trend: 'up', metricsSystem: 'medallia' },
  { id: '10', name: 'Mobile Experience', overallScore: 64, scoreMoM: -3, easeOfUse: 3.1, usefulness: 3.4, responses: 143, trend: 'down', metricsSystem: 'medallia' },
  { id: '11', name: 'One Paint', overallScore: 77, scoreMoM: 2, easeOfUse: 4.0, usefulness: 4.1, responses: 234, trend: 'up', metricsSystem: 'medallia' },
  { id: '12', name: 'Order Fulfillment', overallScore: 73, scoreMoM: 1, easeOfUse: 3.7, usefulness: 3.9, responses: 312, trend: 'up', metricsSystem: 'medallia' },
  { id: '13', name: 'Rental Toolbox', overallScore: 69, scoreMoM: -1, easeOfUse: 3.5, usefulness: 3.6, responses: 267, trend: 'down', metricsSystem: 'medallia' },
  { id: '14', name: 'Sidekick', overallScore: 45, scoreMoM: -7, easeOfUse: 2.1, usefulness: 2.5, responses: 189, trend: 'down', metricsSystem: 'medallia' },
  { id: '15', name: 'SKU Depot', overallScore: 80, scoreMoM: 3, easeOfUse: 4.1, usefulness: 4.2, responses: 401, trend: 'up', metricsSystem: 'medallia' },
  { id: '16', name: 'Store Pulse', overallScore: 71, scoreMoM: 0, easeOfUse: 3.6, usefulness: 3.8, responses: 356, trend: 'stable', metricsSystem: 'medallia' },
];

export const mockJourneys: JourneyData[] = [
  { id: 'j1', name: 'Start Online Return In Store (SORIS)', overallScore: 75, touchpoints: 8, appsInvolved: 4, trend: 'up', trendValue: 3, trendPercentage: 4 },
  { id: 'j2', name: 'RTV Even Exchange', overallScore: 68, touchpoints: 12, appsInvolved: 6, trend: 'stable', trendValue: 0, trendPercentage: 0 },
  { id: 'j3', name: 'Create a Quote', overallScore: 71, touchpoints: 5, appsInvolved: 3, trend: 'down', trendValue: -2, trendPercentage: -3 },
  { id: 'j4', name: 'Modify a Customers Order', overallScore: 79, touchpoints: 7, appsInvolved: 5, trend: 'up', trendValue: 5, trendPercentage: 7 },
  { id: 'j5', name: 'Buy Online Pickup In Store', overallScore: 73, touchpoints: 9, appsInvolved: 4, trend: 'up', trendValue: 2, trendPercentage: 3 },
  { id: 'j6', name: 'Buy Online Deliver From Store', overallScore: 65, touchpoints: 11, appsInvolved: 6, trend: 'stable', trendValue: 1, trendPercentage: 2 },
];

export const getScoreColor = (score: number): string => {
  if (score >= 65) return 'text-green-700';
  if (score >= 50) return 'text-yellow-700';
  return 'text-orange-700';
};

export const getScoreBgColor = (score: number): string => {
  if (score >= 65) return 'bg-green-50';
  if (score >= 50) return 'bg-yellow-50';
  return 'bg-orange-50';
};

export const getScoreBorderColor = (score: number): string => {
  if (score >= 65) return 'border-green-200';
  if (score >= 50) return 'border-yellow-200';
  return 'border-orange-200';
};

export const getTrendIcon = (trend: 'up' | 'down' | 'stable'): string => {
  if (trend === 'up') return '↑';
  if (trend === 'down') return '↓';
  return '→';
};

export const getTrendColor = (trend: 'up' | 'down' | 'stable'): string => {
  if (trend === 'up') return 'text-green-600';
  if (trend === 'down') return 'text-red-600';
  return 'text-gray-600';
};