import { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Plus, Edit2, Save, X, ChevronDown, ChevronUp, Trash2, GripVertical, ArrowRight, Eye, Clock, CheckCircle, XCircle } from 'lucide-react';
import { mockApps, getScoreColor } from '../data/mockData';
import { AdminTabNav } from './AdminTabNav';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface ManageJourneysProps {
  onNavigateBack: () => void;
  onNavigateHome: () => void;
  onNavigateAllApps: () => void;
  onNavigateKeyJourneys: () => void;
  onNavigateTopPains: () => void;
  onTabChange: (tab: 'manage-themes' | 'manage-journeys' | 'manage-apps' | 'settings') => void;
}

interface JourneyStep {
  id: string;
  stepNumber: number;
  name: string;
  appId: string;
  appName: string;
  description?: string;
  isCustomApp?: boolean; // Flag for manually entered apps not in database
  isNewStep?: boolean; // Flag for newly created steps that will be added to database
  scoreCount?: number; // Number of UX-lite survey responses for this step
}

// Mock master list of steps from database - these are reusable across journeys
const masterSteps = [
  { id: 'step_1', name: 'Initiate Return', appId: '1', appName: '1Returns', scoreCount: 324 },
  { id: 'step_2', name: 'Verify Eligibility', appId: '1', appName: '1Returns', scoreCount: 298 },
  { id: 'step_3', name: 'Verify Product Eligibility', appId: '1', appName: '1Returns', scoreCount: 412 },
  { id: 'step_4', name: 'Process Refund', appId: '3', appName: 'Order Up', scoreCount: 267 },
  { id: 'step_5', name: 'Update Customer Record', appId: '7', appName: 'Customer Assistance', scoreCount: 189 },
  { id: 'step_6', name: 'Generate Return Label', appId: '1', appName: '1Returns', scoreCount: 356 },
  { id: 'step_7', name: 'Track Return Shipment', appId: '9', appName: 'Freight Management', scoreCount: 203 },
  { id: 'step_8', name: 'Confirm Receipt', appId: '12', appName: 'Order Fulfillment', scoreCount: 145 },
  { id: 'step_9', name: 'Close Return Case', appId: '1', appName: '1Returns', scoreCount: 378 },
  { id: 'step_10', name: 'Scan Receipt/Lookup Order', appId: '1', appName: '1Returns', scoreCount: 421 },
  { id: 'step_11', name: 'Verify Product Condition', appId: '1', appName: '1Returns', scoreCount: 312 },
  { id: 'step_12', name: 'Locate Replacement', appId: '15', appName: 'SKU Depot', scoreCount: 234 },
  { id: 'step_13', name: 'Process Exchange', appId: '3', appName: 'Order Up', scoreCount: 198 },
  { id: 'step_14', name: 'Update Inventory', appId: '12', appName: 'Order Fulfillment', scoreCount: 156 },
  { id: 'step_15', name: 'Vendor Notification', appId: '9', appName: 'Freight Management', scoreCount: 87 },
  { id: 'step_16', name: 'Search Products', appId: '15', appName: 'SKU Depot', scoreCount: 445 },
  { id: 'step_17', name: 'Add Items to Quote', appId: '3', appName: 'Order Up', scoreCount: 389 },
  { id: 'step_18', name: 'Apply Pro Pricing', appId: '5', appName: 'Specialty Project tool', scoreCount: 276 },
  { id: 'step_19', name: 'Generate Quote Document', appId: '5', appName: 'Specialty Project tool', scoreCount: 312 },
  { id: 'step_20', name: 'Send to Customer', appId: '7', appName: 'Customer Assistance', scoreCount: 234 },
  { id: 'step_21', name: 'Locate Order', appId: '3', appName: 'Order Up', scoreCount: 401 },
  { id: 'step_22', name: 'Verify Changes Allowed', appId: '3', appName: 'Order Up', scoreCount: 178 },
  { id: 'step_23', name: 'Update Order Details', appId: '3', appName: 'Order Up', scoreCount: 289 },
  { id: 'step_24', name: 'Process Payment Adjustment', appId: '3', appName: 'Order Up', scoreCount: 167 },
  { id: 'step_25', name: 'Confirm Modification', appId: '7', appName: 'Customer Assistance', scoreCount: 123 },
  { id: 'step_26', name: 'Verify Order Ready', appId: '2', appName: 'My View', scoreCount: 512 },
  { id: 'step_27', name: 'Locate Items in Store', appId: '6', appName: 'Curbside', scoreCount: 467 },
  { id: 'step_28', name: 'Confirm Customer Identity', appId: '7', appName: 'Customer Assistance', scoreCount: 389 },
  { id: 'step_29', name: 'Complete Pickup', appId: '2', appName: 'My View', scoreCount: 478 },
  { id: 'step_30', name: 'Close Order', appId: '3', appName: 'Order Up', scoreCount: 345 },
  { id: 'step_31', name: 'Receive Order', appId: '3', appName: 'Order Up', scoreCount: 423 },
  { id: 'step_32', name: 'Pick Items from Store', appId: '12', appName: 'Order Fulfillment', scoreCount: 398 },
  { id: 'step_33', name: 'Stage for Delivery', appId: '12', appName: 'Order Fulfillment', scoreCount: 356 },
  { id: 'step_34', name: 'Assign to Delivery Route', appId: '9', appName: 'Freight Management', scoreCount: 289 },
  { id: 'step_35', name: 'Track Delivery', appId: '9', appName: 'Freight Management', scoreCount: 301 },
  { id: 'step_36', name: 'Confirm Delivery', appId: '7', appName: 'Customer Assistance', scoreCount: 267 },
];

interface Journey {
  id: string;
  name: string;
  description?: string;
  steps: JourneyStep[];
  createdAt: string;
  updatedAt: string;
  status: 'pending' | 'active' | 'inactive';
  collectionFrequency?: 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'semi-annually' | 'annually';
  measuredStartDate?: string;
  measuredEndDate?: string;
}

// Mock data - in production this would come from your database
const mockJourneys: Journey[] = [
  {
    id: '1',
    name: 'Start Online Return In Store (SORIS)',
    description: 'Customer initiates online return and completes it in-store',
    steps: [
      { id: 's1', stepNumber: 1, name: 'Scan Receipt/Lookup Order', appId: '1', appName: '1Returns', description: 'Associate scans receipt or searches for order in system' },
      { id: 's2', stepNumber: 2, name: 'Verify Product Eligibility', appId: '1', appName: '1Returns', description: 'Confirm product qualifies for return per policy' },
      { id: 's3', stepNumber: 3, name: 'Process Refund', appId: '3', appName: 'Order Up', description: 'Process refund to original payment method' },
      { id: 's4', stepNumber: 4, name: 'Update Customer Record', appId: '7', appName: 'Customer Assistance', description: 'Log return in customer profile' },
      { id: 's5', stepNumber: 5, name: 'Generate Return Label', appId: '1', appName: '1Returns', description: 'Print return documentation' },
      { id: 's6', stepNumber: 6, name: 'Track Return Shipment', appId: '9', appName: 'Freight Management', description: 'Monitor return to warehouse' },
      { id: 's7', stepNumber: 7, name: 'Confirm Receipt', appId: '12', appName: 'Order Fulfillment', description: 'Verify item received at warehouse' },
      { id: 's8', stepNumber: 8, name: 'Close Return Case', appId: '1', appName: '1Returns', description: 'Complete and archive return transaction' },
    ],
    createdAt: '2024-01-15',
    updatedAt: '2025-11-10',
    status: 'active',
    collectionFrequency: 'monthly',
  },
  {
    id: '2',
    name: 'RTV Even Exchange',
    description: 'Return to vendor with even exchange for customer',
    steps: [
      { id: 's9', stepNumber: 1, name: 'Initiate Return', appId: '1', appName: '1Returns', description: 'Start RTV process' },
      { id: 's10', stepNumber: 2, name: 'Verify Product Condition', appId: '1', appName: '1Returns', description: 'Inspect returned item' },
      { id: 's11', stepNumber: 3, name: 'Locate Replacement', appId: '15', appName: 'SKU Depot', description: 'Find matching product for exchange' },
      { id: 's12', stepNumber: 4, name: 'Process Exchange', appId: '3', appName: 'Order Up', description: 'Complete exchange transaction' },
      { id: 's13', stepNumber: 5, name: 'Update Inventory', appId: '12', appName: 'Order Fulfillment', description: 'Adjust stock levels' },
      { id: 's14', stepNumber: 6, name: 'Vendor Notification', appId: '9', appName: 'Freight Management', description: 'Alert vendor of return' },
    ],
    createdAt: '2024-02-10',
    updatedAt: '2025-11-08',
    status: 'pending',
    collectionFrequency: 'quarterly',
  },
  {
    id: '3',
    name: 'Create a Quote',
    description: 'Pro customer or associate creates a project quote',
    steps: [
      { id: 's15', stepNumber: 1, name: 'Search Products', appId: '15', appName: 'SKU Depot', description: 'Find items for quote' },
      { id: 's16', stepNumber: 2, name: 'Add Items to Quote', appId: '3', appName: 'Order Up', description: 'Build quote with selected products' },
      { id: 's17', stepNumber: 3, name: 'Apply Pro Pricing', appId: '5', appName: 'Specialty Project tool', description: 'Calculate discounts and pricing' },
      { id: 's18', stepNumber: 4, name: 'Generate Quote Document', appId: '5', appName: 'Specialty Project tool', description: 'Create PDF quote' },
      { id: 's19', stepNumber: 5, name: 'Send to Customer', appId: '7', appName: 'Customer Assistance', description: 'Email or print quote for customer' },
    ],
    createdAt: '2024-04-05',
    updatedAt: '2025-11-12',
    status: 'inactive',
    measuredStartDate: '2024-01',
    measuredEndDate: '2024-07',
  },
  {
    id: '4',
    name: 'Modify a Customers Order',
    description: 'Update existing customer order with changes',
    steps: [
      { id: 's20', stepNumber: 1, name: 'Locate Order', appId: '3', appName: 'Order Up', description: 'Search for customer order by number or phone' },
      { id: 's21', stepNumber: 2, name: 'Verify Changes Allowed', appId: '3', appName: 'Order Up', description: 'Check order status and modification rules' },
      { id: 's22', stepNumber: 3, name: 'Update Order Details', appId: '3', appName: 'Order Up', description: 'Modify items, quantities, or delivery' },
      { id: 's23', stepNumber: 4, name: 'Process Payment Adjustment', appId: '3', appName: 'Order Up', description: 'Refund or charge difference' },
      { id: 's24', stepNumber: 5, name: 'Confirm Modification', appId: '7', appName: 'Customer Assistance', description: 'Send update notification to customer' },
    ],
    createdAt: '2024-05-20',
    updatedAt: '2025-11-09',
    status: 'active',
    collectionFrequency: 'monthly',
  },
  {
    id: '5',
    name: 'Buy Online Pickup In Store',
    description: 'Customer orders online and picks up at store',
    steps: [
      { id: 's25', stepNumber: 1, name: 'Verify Order Ready', appId: '2', appName: 'My View', description: 'Check order status and pickup readiness' },
      { id: 's26', stepNumber: 2, name: 'Locate Items in Store', appId: '6', appName: 'Curbside', description: 'Find staged order in pickup area' },
      { id: 's27', stepNumber: 3, name: 'Confirm Customer Identity', appId: '7', appName: 'Customer Assistance', description: 'Verify customer with ID or confirmation' },
      { id: 's28', stepNumber: 4, name: 'Complete Pickup', appId: '2', appName: 'My View', description: 'Mark order as picked up' },
      { id: 's29', stepNumber: 5, name: 'Close Order', appId: '3', appName: 'Order Up', description: 'Finalize transaction and update inventory' },
    ],
    createdAt: '2024-06-15',
    updatedAt: '2025-11-11',
    status: 'active',
    collectionFrequency: 'bi-weekly',
  },
  {
    id: '6',
    name: 'Buy Online Deliver From Store',
    description: 'Online order fulfilled and delivered from local store',
    steps: [
      { id: 's30', stepNumber: 1, name: 'Receive Order', appId: '3', appName: 'Order Up', description: 'New online order routed to store' },
      { id: 's31', stepNumber: 2, name: 'Pick Items from Store', appId: '12', appName: 'Order Fulfillment', description: 'Locate and pull items from shelves' },
      { id: 's32', stepNumber: 3, name: 'Stage for Delivery', appId: '12', appName: 'Order Fulfillment', description: 'Package and prepare order' },
      { id: 's33', stepNumber: 4, name: 'Assign to Delivery Route', appId: '9', appName: 'Freight Management', description: 'Schedule delivery with driver' },
      { id: 's34', stepNumber: 5, name: 'Track Delivery', appId: '9', appName: 'Freight Management', description: 'Monitor delivery status' },
      { id: 's35', stepNumber: 6, name: 'Confirm Delivery', appId: '7', appName: 'Customer Assistance', description: 'Customer confirms receipt' },
    ],
    createdAt: '2024-07-10',
    updatedAt: '2025-11-13',
    status: 'pending',
    collectionFrequency: 'weekly',
  },
];

export function ManageJourneys({
  onNavigateBack,
  onNavigateHome,
  onNavigateAllApps,
  onNavigateKeyJourneys,
  onNavigateTopPains,
  onTabChange,
}: ManageJourneysProps) {
  const [journeys, setJourneys] = useState<Journey[]>(mockJourneys);
  const [expandedJourneyId, setExpandedJourneyId] = useState<string | null>(null);
  const [editingJourneyId, setEditingJourneyId] = useState<string | null>(null);
  const [editingJourney, setEditingJourney] = useState<Journey | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newJourney, setNewJourney] = useState<Partial<Journey>>({
    name: '',
    description: '',
    steps: [],
    status: 'pending',
    collectionFrequency: 'monthly',
  });
  const [successMessage, setSuccessMessage] = useState('');
  const [previewJourney, setPreviewJourney] = useState<Journey | null>(null);
  const [previewTrendView, setPreviewTrendView] = useState<'overall' | 'by-app' | 'by-step'>('overall');

  const startEditing = (journey: Journey) => {
    setEditingJourneyId(journey.id);
    setEditingJourney({ ...journey, steps: [...journey.steps] });
    setExpandedJourneyId(journey.id);
  };

  const cancelEditing = () => {
    setEditingJourneyId(null);
    setEditingJourney(null);
  };

  const saveJourney = () => {
    if (editingJourney) {
      setJourneys(journeys.map(j => j.id === editingJourney.id ? { ...editingJourney, updatedAt: new Date().toISOString().split('T')[0] } : j));
      setEditingJourneyId(null);
      setEditingJourney(null);
      setSuccessMessage('Journey updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const startAddingNew = () => {
    setIsAddingNew(true);
    setNewJourney({
      name: '',
      description: '',
      steps: [],
      status: 'pending',
      collectionFrequency: 'monthly',
    });
  };

  const cancelAddingNew = () => {
    setIsAddingNew(false);
    setNewJourney({
      name: '',
      description: '',
      steps: [],
      status: 'pending',
      collectionFrequency: 'monthly',
    });
  };

  const saveNewJourney = () => {
    if (newJourney.name && newJourney.name.trim() !== '' && newJourney.steps && newJourney.steps.length > 0) {
      const journey: Journey = {
        id: String(journeys.length + 1),
        name: newJourney.name,
        description: newJourney.description || '',
        steps: newJourney.steps,
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0],
        status: newJourney.status ?? 'pending',
        collectionFrequency: newJourney.collectionFrequency,
        measuredStartDate: newJourney.measuredStartDate,
        measuredEndDate: newJourney.measuredEndDate,
      };
      setJourneys([...journeys, journey]);
      setIsAddingNew(false);
      setNewJourney({ name: '', description: '', steps: [], status: 'pending', collectionFrequency: 'monthly' });
      setSuccessMessage('Journey created successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const deleteJourney = (id: string) => {
    if (confirm('Are you sure you want to delete this journey? This action cannot be undone.')) {
      setJourneys(journeys.filter(j => j.id !== id));
      setSuccessMessage('Journey deleted successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const updateEditingJourney = (field: keyof Journey, value: any) => {
    if (editingJourney) {
      setEditingJourney({ ...editingJourney, [field]: value });
    }
  };

  const updateNewJourney = (field: keyof Journey, value: any) => {
    setNewJourney({ ...newJourney, [field]: value });
  };

  // Step management for editing
  const addStepToEditing = () => {
    if (editingJourney) {
      const newStep: JourneyStep = {
        id: `s${Date.now()}`,
        stepNumber: editingJourney.steps.length + 1,
        name: '',
        appId: '',
        appName: '',
        description: '',
        isNewStep: true,
      };
      updateEditingJourney('steps', [...editingJourney.steps, newStep]);
    }
  };

  const updateStepInEditing = (stepId: string, field: keyof JourneyStep, value: any) => {
    if (editingJourney) {
      const updatedSteps = editingJourney.steps.map(step => {
        if (step.id === stepId) {
          if (field === 'stepSelection') {
            // User selected from the step dropdown
            if (value === '__new__') {
              // User wants to create a new step
              return { ...step, name: '', appId: '', appName: '', isNewStep: true, isCustomApp: false };
            } else {
              // User selected existing step - populate from master list
              const masterStep = masterSteps.find(s => s.id === value);
              if (masterStep) {
                return { 
                  ...step, 
                  name: masterStep.name, 
                  appId: masterStep.appId, 
                  appName: masterStep.appName, 
                  scoreCount: masterStep.scoreCount,
                  isNewStep: false, 
                  isCustomApp: false 
                };
              }
            }
          }
          if (field === 'appId') {
            if (value === '__custom__') {
              // User selected custom app option
              return { ...step, appId: '__custom__', appName: '', isCustomApp: true };
            } else {
              // User selected from dropdown
              const app = mockApps.find(a => a.id === value);
              return { ...step, appId: value, appName: app?.name || '', isCustomApp: false };
            }
          }
          return { ...step, [field]: value };
        }
        return step;
      });
      updateEditingJourney('steps', updatedSteps);
    }
  };

  const removeStepFromEditing = (stepId: string) => {
    if (editingJourney && editingJourney.steps.length > 1) {
      const updatedSteps = editingJourney.steps
        .filter(step => step.id !== stepId)
        .map((step, index) => ({ ...step, stepNumber: index + 1 }));
      updateEditingJourney('steps', updatedSteps);
    }
  };

  // Step management for new journey
  const addStepToNew = () => {
    const newStep: JourneyStep = {
      id: `s${Date.now()}`,
      stepNumber: (newJourney.steps?.length || 0) + 1,
      name: '',
      appId: '',
      appName: '',
      description: '',
      isNewStep: true,
    };
    updateNewJourney('steps', [...(newJourney.steps || []), newStep]);
  };

  const updateStepInNew = (stepId: string, field: keyof JourneyStep, value: any) => {
    const updatedSteps = (newJourney.steps || []).map(step => {
      if (step.id === stepId) {
        if (field === 'stepSelection') {
          // User selected from the step dropdown
          if (value === '__new__') {
            // User wants to create a new step
            return { ...step, name: '', appId: '', appName: '', isNewStep: true, isCustomApp: false };
          } else {
            // User selected existing step - populate from master list
            const masterStep = masterSteps.find(s => s.id === value);
            if (masterStep) {
              return { 
                ...step, 
                name: masterStep.name, 
                appId: masterStep.appId, 
                appName: masterStep.appName, 
                scoreCount: masterStep.scoreCount,
                isNewStep: false, 
                isCustomApp: false 
              };
            }
          }
        }
        if (field === 'appId') {
          if (value === '__custom__') {
            // User selected custom app option
            return { ...step, appId: '__custom__', appName: '', isCustomApp: true };
          } else {
            // User selected from dropdown
            const app = mockApps.find(a => a.id === value);
            return { ...step, appId: value, appName: app?.name || '', isCustomApp: false };
          }
        }
        return { ...step, [field]: value };
      }
      return step;
    });
    updateNewJourney('steps', updatedSteps);
  };

  const removeStepFromNew = (stepId: string) => {
    const updatedSteps = (newJourney.steps || [])
      .filter(step => step.id !== stepId)
      .map((step, index) => ({ ...step, stepNumber: index + 1 }));
    updateNewJourney('steps', updatedSteps);
  };

  const getUniqueApps = (steps: JourneyStep[]) => {
    const uniqueAppIds = new Set(steps.map(step => step.appId).filter(id => id));
    return Array.from(uniqueAppIds).map(appId => {
      const app = mockApps.find(a => a.id === appId);
      return app?.name || 'Unknown';
    });
  };

  const navItems = [
    { id: 'home', label: 'Home', onClick: onNavigateHome },
    { id: 'all-apps', label: 'All Apps', onClick: onNavigateAllApps },
    { id: 'key-journeys', label: 'Key Journeys', onClick: onNavigateKeyJourneys },
    { id: 'top-pains', label: 'Top Pains', onClick: onNavigateTopPains },
  ];

  // Preview functions
  const openPreview = (journey: Journey | Partial<Journey>) => {
    // Generate mock trend data for preview
    const previewData: Journey = {
      id: journey.id || 'preview',
      name: journey.name || 'Untitled Journey',
      description: journey.description || '',
      steps: journey.steps || [],
      createdAt: journey.createdAt || new Date().toISOString().split('T')[0],
      updatedAt: journey.updatedAt || new Date().toISOString().split('T')[0],
      status: journey.status || 'pending',
      collectionFrequency: journey.collectionFrequency || 'monthly',
      measuredStartDate: journey.measuredStartDate,
      measuredEndDate: journey.measuredEndDate,
    };
    setPreviewJourney(previewData);
    setPreviewTrendView('overall'); // Reset to overall view when opening preview
  };

  const closePreview = () => {
    setPreviewJourney(null);
    setPreviewTrendView('overall');
  };

  // Generate mock trend data for preview
  const generatePreviewTrendData = () => {
    if (!previewJourney) return [];
    
    // Generate random but realistic trending scores
    const baseScore = 55 + Math.floor(Math.random() * 20);
    
    if (previewTrendView === 'overall') {
      return [
        { period: 'Jan', score: baseScore - 15 },
        { period: 'Feb', score: baseScore - 12 },
        { period: 'Mar', score: baseScore - 8 },
        { period: 'Apr', score: baseScore - 5 },
        { period: 'May', score: baseScore - 2 },
        { period: 'Jun', score: baseScore },
        { period: 'Jul', score: baseScore + 3 },
        { period: 'Aug', score: baseScore + 5 },
        { period: 'Sep', score: baseScore + 8 },
        { period: 'Oct', score: baseScore + 10 },
        { period: 'Nov', score: baseScore + 12 },
      ];
    } else if (previewTrendView === 'by-app') {
      // Get unique apps from journey steps
      const uniqueApps = Array.from(new Set(previewJourney.steps.map(s => s.appName)));
      const data: any[] = [];
      
      for (let i = 0; i < 11; i++) {
        const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'][i];
        const dataPoint: any = { 
          period: month,
          overall: baseScore - 15 + (i * 2.5)
        };
        
        uniqueApps.forEach(appName => {
          const appBaseScore = 50 + Math.floor(Math.random() * 25);
          dataPoint[appName] = appBaseScore - 10 + (i * 2);
        });
        
        data.push(dataPoint);
      }
      return data;
    } else {
      // by-step view
      const data: any[] = [];
      
      for (let i = 0; i < 11; i++) {
        const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'][i];
        const dataPoint: any = { 
          period: month,
          overall: baseScore - 15 + (i * 2.5)
        };
        
        previewJourney.steps.forEach((step, idx) => {
          const stepBaseScore = 45 + Math.floor(Math.random() * 30);
          dataPoint[`Step ${idx + 1}`] = stepBaseScore - 8 + (i * 2);
        });
        
        data.push(dataPoint);
      }
      return data;
    }
  };

  // Get chart lines for preview based on view
  const getPreviewChartLines = () => {
    if (!previewJourney) return [];
    
    if (previewTrendView === 'by-app') {
      return Array.from(new Set(previewJourney.steps.map(s => s.appName)));
    } else if (previewTrendView === 'by-step') {
      return previewJourney.steps.map((_, idx) => `Step ${idx + 1}`);
    }
    return [];
  };

  // Get line color for preview chart
  const getPreviewLineColor = (line: string, index: number) => {
    const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#6366f1', '#14b8a6', '#f97316'];
    return colors[index % colors.length];
  };

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
                <h1 className="font-semibold">Admin: Manage Key Journeys</h1>
              </div>
              <p className="text-white/90 mt-1 text-sm">
                Add, view, and edit key journeys with their steps and associated apps
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onNavigateBack}
              className="bg-orange-700 border-orange-600 text-white hover:bg-orange-600"
            >
              Back
            </Button>
          </div>
        </div>
      </header>

      {/* Admin Tabs */}
      <AdminTabNav activeTab="manage-journeys" onTabChange={onTabChange} />

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded text-green-800">
            {successMessage}
          </div>
        )}

        {/* Add New Journey Button */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">All Journeys ({journeys.length})</h2>
            <p className="text-sm text-slate-600 mt-1">Manage key customer journeys with sequential steps and apps</p>
          </div>
          {!isAddingNew && (
            <Button
              onClick={startAddingNew}
              style={{ backgroundColor: '#ff6900' }}
              className="text-white hover:opacity-90"
            >
              <Plus className="size-4 mr-2" />
              Add New Journey
            </Button>
          )}
        </div>

        {/* Add New Journey Form */}
        {isAddingNew && (
          <Card className="mb-6 border-2 border-[#ff6900] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 p-6 bg-white">
              <h3 className="text-lg font-semibold text-slate-900">Create New Journey</h3>
              <Button variant="ghost" size="sm" onClick={cancelAddingNew}>
                <X className="size-4" />
              </Button>
            </div>

            <div className="flex">
              {/* Left Panel - Form */}
              <div className="flex-1 p-6 border-r border-slate-200 bg-white space-y-6">
                {/* Basic Information Section */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 mb-4">Basic Information</h4>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="newName">
                        Journey Name <span className="text-red-600">*</span>
                      </Label>
                      <Input
                        id="newName"
                        value={newJourney.name || ''}
                        onChange={(e) => updateNewJourney('name', e.target.value)}
                        placeholder="e.g., Schedule Patient Visit"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="newDescription">Description (Optional)</Label>
                      <Textarea
                        id="newDescription"
                        value={newJourney.description || ''}
                        onChange={(e) => updateNewJourney('description', e.target.value)}
                        placeholder="Describe this journey..."
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                {/* Collection Settings Section */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 mb-4">Collection Settings</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="newStatus">
                        Collection Status <span className="text-red-600">*</span>
                      </Label>
                      <Select
                        value={newJourney.status || 'pending'}
                        onValueChange={(value: any) => updateNewJourney('status', value)}
                      >
                        <SelectTrigger id="newStatus">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending - Not Yet Collecting Data</SelectItem>
                          <SelectItem value="active">Active - Currently Collecting Data</SelectItem>
                          <SelectItem value="inactive">Inactive - No Longer Being Measured</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {(newJourney.status === 'pending' || newJourney.status === 'active') && (
                      <div className="space-y-2">
                        <Label htmlFor="newFrequency">
                          Collection Frequency <span className="text-red-600">*</span>
                        </Label>
                        <Select
                          value={newJourney.collectionFrequency || 'monthly'}
                          onValueChange={(value: any) => updateNewJourney('collectionFrequency', value)}
                        >
                          <SelectTrigger id="newFrequency">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="quarterly">Quarterly</SelectItem>
                            <SelectItem value="semi-annually">Semi-annually</SelectItem>
                            <SelectItem value="annually">Annually</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {newJourney.status === 'inactive' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="newMeasuredStart">
                          Measured From <span className="text-red-600">*</span>
                        </Label>
                        <Input
                          id="newMeasuredStart"
                          type="month"
                          value={newJourney.measuredStartDate || ''}
                          onChange={(e) => updateNewJourney('measuredStartDate', e.target.value)}
                          placeholder="e.g., 2024-01"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newMeasuredEnd">
                          Measured Until <span className="text-red-600">*</span>
                        </Label>
                        <Input
                          id="newMeasuredEnd"
                          type="month"
                          value={newJourney.measuredEndDate || ''}
                          onChange={(e) => updateNewJourney('measuredEndDate', e.target.value)}
                          placeholder="e.g., 2024-07"
                        />
                      </div>
                    </div>
                  )}
                </div>

              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">
                      Define Journey Steps <span className="text-red-600">*</span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Add the sequential steps that make up this journey
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addStepToNew}
                  >
                    <Plus className="size-4 mr-1" />
                    Add Step
                  </Button>
                </div>

                {(newJourney.steps || []).length === 0 && (
                  <div className="text-center py-8 bg-slate-50 border border-slate-200 rounded-lg">
                    <p className="text-slate-600 text-sm">No steps added yet. Click "Add Step" to begin.</p>
                  </div>
                )}

                {(newJourney.steps || []).map((step, index) => (
                  <div key={step.id} className="border border-slate-300 rounded-lg p-4 bg-white">
                    <div className="flex items-start gap-3">
                      <div className="flex items-center justify-center size-8 rounded-full bg-[#ff6900] text-white font-semibold shrink-0 mt-1">
                        {step.stepNumber}
                      </div>
                      <div className="flex-1">
                        {/* Main Grid Layout - 3 columns on large screens */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                          {/* Left Section: Step Selection - spans 2 cols */}
                          <div className="lg:col-span-2 space-y-3">
                            {/* Step Selection Dropdown */}
                            <div className="space-y-1">
                              <Label className="text-xs text-slate-600 font-semibold">
                                Select Existing Step or Create New *
                              </Label>
                              <Select
                                value={step.isNewStep ? '__new__' : (step.name ? 'selected' : '')}
                                onValueChange={(value) => updateStepInNew(step.id, 'stepSelection', value)}
                              >
                                <SelectTrigger className="text-sm">
                                  <SelectValue placeholder="Choose a step or create new...">
                                    {step.isNewStep ? '+ Create New Step' : (step.name || 'Choose a step or create new...')}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__new__" className="text-green-700 font-medium">
                                    + Create New Step (will be added to database)
                                  </SelectItem>
                                  <div className="my-1 border-t border-slate-200"></div>
                                  {masterSteps.map(masterStep => (
                                    <SelectItem key={masterStep.id} value={masterStep.id}>
                                      <div className="flex items-center justify-between gap-2 w-full">
                                        <span>{masterStep.name}</span>
                                        <span className="text-xs text-slate-500">→ {masterStep.appName}</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-slate-500">Choose from tracked steps or create new</p>
                            </div>

                            {/* If creating new step, show compact input fields */}
                            {step.isNewStep && (
                              <div className="bg-green-50 border border-green-200 rounded p-2.5 space-y-2">
                                <div className="flex items-center gap-2">
                                  <div className="size-4 rounded-full bg-green-600 text-white flex items-center justify-center shrink-0">
                                    <Plus className="size-2.5" />
                                  </div>
                                  <p className="text-xs font-semibold text-green-900">Creating New Step - will track UX-lite scores</p>
                                </div>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <Label className="text-xs text-slate-700">Step Name *</Label>
                                    <Input
                                      value={step.name}
                                      onChange={(e) => updateStepInNew(step.id, 'name', e.target.value)}
                                      placeholder="e.g., Check Availability"
                                      className="text-sm bg-white h-8"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs text-slate-700">
                                      Primary App * <span className="text-slate-500 font-normal">(tracked)</span>
                                    </Label>
                                    <Select
                                      value={step.appId}
                                      onValueChange={(value) => updateStepInNew(step.id, 'appId', value)}
                                    >
                                      <SelectTrigger className="text-sm bg-white h-8">
                                        <SelectValue placeholder="Select app..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="__custom__" className="text-amber-700 font-medium">
                                          -- Other App (Not Tracked) --
                                        </SelectItem>
                                        {mockApps.map(app => (
                                          <SelectItem key={app.id} value={app.id}>{app.name}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>

                                {step.isCustomApp && (
                                  <div className="bg-amber-50 border border-amber-200 rounded p-2">
                                    <Label className="text-xs text-slate-700 mb-1 block">
                                      Custom App Name * <span className="text-amber-700 font-normal">(not tracked)</span>
                                    </Label>
                                    <Input
                                      value={step.appName}
                                      onChange={(e) => updateStepInNew(step.id, 'appName', e.target.value)}
                                      placeholder="Enter app name..."
                                      className="text-sm bg-white h-8"
                                    />
                                  </div>
                                )}
                              </div>
                            )}

                            {/* If existing step selected, show compact info */}
                            {!step.isNewStep && step.name && (
                              <div className="bg-blue-50 border border-blue-200 rounded p-2.5">
                                <p className="text-xs font-semibold text-blue-900 mb-1.5">Using Existing Step from Database</p>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-medium text-blue-900">{step.name}</span>
                                  <span className="text-blue-600">→</span>
                                  <span className="bg-blue-100 px-2 py-0.5 rounded text-xs text-blue-800 font-medium">{step.appName}</span>
                                  <span className="text-xs text-blue-700">• {step.scoreCount ?? 0} UX-Lite Score{(step.scoreCount ?? 0) === 1 ? '' : 's'}</span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Right Section: Description - spans 1 col */}
                          <div className="lg:col-span-1">
                            {step.name && (
                              <div className="space-y-1">
                                <Label className="text-xs text-slate-600 font-semibold">
                                  Journey Context
                                </Label>
                                <Textarea
                                  value={step.description || ''}
                                  onChange={(e) => updateStepInNew(step.id, 'description', e.target.value)}
                                  placeholder="How this step fits in this journey..."
                                  rows={4}
                                  className="text-sm resize-none"
                                />
                                <p className="text-xs text-slate-500">Optional context for this journey</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeStepFromNew(step.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0"
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                    {index < (newJourney.steps || []).length - 1 && (
                      <div className="flex justify-center mt-2">
                        <ArrowRight className="size-5 text-slate-400 rotate-90" />
                      </div>
                    )}
                  </div>
                ))}

                </div>
              </div>

              {/* Right Panel - Live Preview */}
              <div className="w-[350px] bg-slate-50 p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Eye className="size-4 text-slate-600" />
                    <h3 className="text-sm font-semibold text-slate-900">Live Preview</h3>
                  </div>

                  {/* Journey Preview Card */}
                  <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-4">
                    {/* Journey Name */}
                    <div>
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Journey Name</div>
                      <div className="text-base font-medium text-slate-900">
                        {newJourney.name && newJourney.name.trim() !== '' ? newJourney.name : <span className="italic text-slate-400">Untitled Journey</span>}
                      </div>
                    </div>

                    {/* Status and Frequency */}
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                      <div>
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Status</div>
                        <div>
                          {newJourney.status === 'pending' && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-100 text-amber-800 text-xs font-medium">
                              <Clock className="size-3" /> Pending
                            </span>
                          )}
                          {newJourney.status === 'active' && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-100 text-green-800 text-xs font-medium">
                              <CheckCircle className="size-3" /> Active
                            </span>
                          )}
                          {newJourney.status === 'inactive' && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 text-slate-700 text-xs font-medium">
                              <XCircle className="size-3" /> Inactive
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Frequency</div>
                        <div className="text-xs text-slate-700 capitalize">
                          {newJourney.collectionFrequency || 'Monthly'}
                        </div>
                      </div>
                    </div>

                    {/* Journey Flow */}
                    <div className="pt-3 border-t border-slate-100">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                        Journey Flow ({(newJourney.steps || []).length} Steps)
                      </div>
                      {(newJourney.steps || []).length === 0 ? (
                        <p className="text-xs text-slate-400 italic text-center py-4">No steps added yet</p>
                      ) : (
                        <div className="space-y-1">
                          {(newJourney.steps || []).map((step, idx) => (
                            <div key={step.id} className="flex items-center gap-2 text-xs">
                              <span className="flex items-center justify-center size-5 rounded-full bg-[#ff6900] text-white font-semibold text-[10px]">
                                {step.stepNumber}
                              </span>
                              <span className="text-slate-700 font-medium">{step.name || `Step ${step.stepNumber}`}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions - Bottom Bar */}
            <div className="flex gap-2 justify-end border-t border-slate-200 p-6 bg-white">
              <Button variant="outline" onClick={cancelAddingNew}>
                Cancel
              </Button>
              <Button
                onClick={saveNewJourney}
                disabled={!newJourney.name || newJourney.name.trim() === '' || !newJourney.steps || newJourney.steps.length === 0}
                style={{ backgroundColor: '#ff6900' }}
                className="text-white hover:opacity-90 disabled:opacity-50"
              >
                Create Journey
              </Button>
            </div>
          </Card>
        )}

        {/* Journeys List */}
        <div className="space-y-4">
          {journeys.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-slate-600">No journeys yet. Click "Add New Journey" to get started.</p>
            </Card>
          ) : (
            journeys.map(journey => {
              const isExpanded = expandedJourneyId === journey.id;
              const isEditing = editingJourneyId === journey.id;
              const currentJourney = isEditing && editingJourney ? editingJourney : journey;
              const uniqueApps = getUniqueApps(currentJourney.steps);

              return (
                <Card key={journey.id} className="overflow-hidden">
                  {/* Journey Header - Always Visible */}
                  <div 
                    className="p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => setExpandedJourneyId(isExpanded ? null : journey.id)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">{journey.name}</h3>
                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          <span>{journey.steps.length} step(s)</span>
                          <span>• {uniqueApps.length} app(s): {uniqueApps.join(', ')}</span>
                          <span>• Updated {journey.updatedAt}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!isEditing && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditing(journey);
                              }}
                              className="text-[#ff6900] hover:text-[#ff6900] hover:bg-orange-50"
                            >
                              <Edit2 className="size-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteJourney(journey.id);
                              }}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="size-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="size-5 text-slate-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="border-t border-slate-200 p-6 bg-slate-50">
                      {isEditing ? (
                        /* Edit Mode - Full Screen Modal-like Experience */
                        <Card className="border-2 border-[#ff6900] overflow-hidden -m-6">
                          {/* Header */}
                          <div className="flex items-center justify-between border-b border-slate-200 p-6 bg-white">
                            <h3 className="text-lg font-semibold text-slate-900">Edit Journey</h3>
                            <Button variant="ghost" size="sm" onClick={cancelEditing}>
                              <X className="size-4" />
                            </Button>
                          </div>

                          <div className="flex">
                            {/* Left Panel - Form */}
                            <div className="flex-1 p-6 border-r border-slate-200 bg-white space-y-6">
                              {/* Basic Information Section */}
                              <div>
                                <h4 className="text-sm font-semibold text-slate-900 mb-4">Basic Information</h4>
                                <div className="space-y-4">
                                  <div className="space-y-2">
                                    <Label>Journey Name <span className="text-red-600">*</span></Label>
                                    <Input
                                      value={currentJourney.name}
                                      onChange={(e) => updateEditingJourney('name', e.target.value)}
                                      placeholder="e.g., Schedule Patient Visit"
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <Label>Description (Optional)</Label>
                                    <Textarea
                                      value={currentJourney.description || ''}
                                      onChange={(e) => updateEditingJourney('description', e.target.value)}
                                      placeholder="Describe this journey..."
                                      rows={3}
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Collection Settings Section */}
                              <div>
                                <h4 className="text-sm font-semibold text-slate-900 mb-4">Collection Settings</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="editStatus">
                                      Collection Status <span className="text-red-600">*</span>
                                    </Label>
                                    <Select
                                      value={currentJourney.status || 'pending'}
                                      onValueChange={(value: any) => updateEditingJourney('status', value)}
                                    >
                                      <SelectTrigger id="editStatus">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="pending">Pending - Not Yet Collecting Data</SelectItem>
                                        <SelectItem value="active">Active - Currently Collecting Data</SelectItem>
                                        <SelectItem value="inactive">Inactive - No Longer Being Measured</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  {(currentJourney.status === 'pending' || currentJourney.status === 'active') && (
                                    <div className="space-y-2">
                                      <Label htmlFor="editFrequency">
                                        Collection Frequency <span className="text-red-600">*</span>
                                      </Label>
                                      <Select
                                        value={currentJourney.collectionFrequency || 'monthly'}
                                        onValueChange={(value: any) => updateEditingJourney('collectionFrequency', value)}
                                      >
                                        <SelectTrigger id="editFrequency">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="weekly">Weekly</SelectItem>
                                          <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                                          <SelectItem value="monthly">Monthly</SelectItem>
                                          <SelectItem value="quarterly">Quarterly</SelectItem>
                                          <SelectItem value="semi-annually">Semi-annually</SelectItem>
                                          <SelectItem value="annually">Annually</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  )}
                                </div>

                                {currentJourney.status === 'inactive' && (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                    <div className="space-y-2">
                                      <Label htmlFor="editMeasuredStart">
                                        Measured From <span className="text-red-600">*</span>
                                      </Label>
                                      <Input
                                        id="editMeasuredStart"
                                        type="month"
                                        value={currentJourney.measuredStartDate || ''}
                                        onChange={(e) => updateEditingJourney('measuredStartDate', e.target.value)}
                                        placeholder="e.g., 2024-01"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="editMeasuredEnd">
                                        Measured Until <span className="text-red-600">*</span>
                                      </Label>
                                      <Input
                                        id="editMeasuredEnd"
                                        type="month"
                                        value={currentJourney.measuredEndDate || ''}
                                        onChange={(e) => updateEditingJourney('measuredEndDate', e.target.value)}
                                        placeholder="e.g., 2024-07"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Define Journey Steps Section */}
                              <div className="space-y-3">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h4 className="text-sm font-semibold text-slate-900">
                                      Define Journey Steps <span className="text-red-600">*</span>
                                    </h4>
                                    <p className="text-xs text-slate-500 mt-1">
                                      Add the sequential steps that make up this journey
                                    </p>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addStepToEditing}
                                  >
                                    <Plus className="size-4 mr-1" />
                                    Add Step
                                  </Button>
                                </div>

                            {currentJourney.steps.map((step, index) => (
                              <div key={step.id}>
                                <div className="border border-slate-300 rounded-lg p-4 bg-white">
                                  <div className="flex items-start gap-3">
                                    <div className="flex items-center justify-center size-8 rounded-full bg-[#ff6900] text-white font-semibold shrink-0 mt-1">
                                      {step.stepNumber}
                                    </div>
                                    <div className="flex-1">
                                      {/* Main Grid Layout - 3 columns on large screens */}
                                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                                        {/* Left Section: Step Selection - spans 2 cols */}
                                        <div className="lg:col-span-2 space-y-3">
                                          {/* Step Selection Dropdown */}
                                          <div className="space-y-1">
                                            <Label className="text-xs text-slate-600 font-semibold">
                                              Select Existing Step or Create New *
                                            </Label>
                                            <Select
                                              value={step.isNewStep ? '__new__' : (step.name ? 'selected' : '')}
                                              onValueChange={(value) => updateStepInEditing(step.id, 'stepSelection', value)}
                                            >
                                              <SelectTrigger className="text-sm">
                                                <SelectValue placeholder="Choose a step or create new...">
                                                  {step.isNewStep ? '+ Create New Step' : (step.name || 'Choose a step or create new...')}
                                                </SelectValue>
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="__new__" className="text-green-700 font-medium">
                                                  + Create New Step (will be added to database)
                                                </SelectItem>
                                                <div className="my-1 border-t border-slate-200"></div>
                                                {masterSteps.map(masterStep => (
                                                  <SelectItem key={masterStep.id} value={masterStep.id}>
                                                    <div className="flex items-center justify-between gap-2 w-full">
                                                      <span>{masterStep.name}</span>
                                                      <span className="text-xs text-slate-500">→ {masterStep.appName}</span>
                                                    </div>
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                            <p className="text-xs text-slate-500">Choose from tracked steps or create new</p>
                                          </div>

                                          {/* If creating new step, show compact input fields */}
                                          {step.isNewStep && (
                                            <div className="bg-green-50 border border-green-200 rounded p-2.5 space-y-2">
                                              <div className="flex items-center gap-2">
                                                <div className="size-4 rounded-full bg-green-600 text-white flex items-center justify-center shrink-0">
                                                  <Plus className="size-2.5" />
                                                </div>
                                                <p className="text-xs font-semibold text-green-900">Creating New Step - will track UX-lite scores</p>
                                              </div>
                                              
                                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                <div className="space-y-1">
                                                  <Label className="text-xs text-slate-700">Step Name *</Label>
                                                  <Input
                                                    value={step.name}
                                                    onChange={(e) => updateStepInEditing(step.id, 'name', e.target.value)}
                                                    placeholder="e.g., Check Availability"
                                                    className="text-sm bg-white h-8"
                                                  />
                                                </div>
                                                <div className="space-y-1">
                                                  <Label className="text-xs text-slate-700">
                                                    Primary App * <span className="text-slate-500 font-normal">(tracked)</span>
                                                  </Label>
                                                  <Select
                                                    value={step.appId}
                                                    onValueChange={(value) => updateStepInEditing(step.id, 'appId', value)}
                                                  >
                                                    <SelectTrigger className="text-sm bg-white h-8">
                                                      <SelectValue placeholder="Select app..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                      <SelectItem value="__custom__" className="text-amber-700 font-medium">
                                                        -- Other App (Not Tracked) --
                                                      </SelectItem>
                                                      {mockApps.map(app => (
                                                        <SelectItem key={app.id} value={app.id}>{app.name}</SelectItem>
                                                      ))}
                                                    </SelectContent>
                                                  </Select>
                                                </div>
                                              </div>

                                              {step.isCustomApp && (
                                                <div className="bg-amber-50 border border-amber-200 rounded p-2">
                                                  <Label className="text-xs text-slate-700 mb-1 block">
                                                    Custom App Name * <span className="text-amber-700 font-normal">(not tracked)</span>
                                                  </Label>
                                                  <Input
                                                    value={step.appName}
                                                    onChange={(e) => updateStepInEditing(step.id, 'appName', e.target.value)}
                                                    placeholder="Enter app name..."
                                                    className="text-sm bg-white h-8"
                                                  />
                                                </div>
                                              )}
                                            </div>
                                          )}

                                          {/* If existing step selected, show compact info */}
                                          {!step.isNewStep && step.name && (
                                            <div className="bg-blue-50 border border-blue-200 rounded p-2.5">
                                              <p className="text-xs font-semibold text-blue-900 mb-1.5">Using Existing Step from Database</p>
                                              <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-sm font-medium text-blue-900">{step.name}</span>
                                                <span className="text-blue-600">→</span>
                                                <span className="bg-blue-100 px-2 py-0.5 rounded text-xs text-blue-800 font-medium">{step.appName}</span>
                                                <span className="text-xs text-blue-700">• {step.scoreCount ?? 0} UX-Lite Score{(step.scoreCount ?? 0) === 1 ? '' : 's'}</span>
                                              </div>
                                            </div>
                                          )}
                                        </div>

                                        {/* Right Section: Description - spans 1 col */}
                                        <div className="lg:col-span-1">
                                          {step.name && (
                                            <div className="space-y-1">
                                              <Label className="text-xs text-slate-600 font-semibold">
                                                Journey Context
                                              </Label>
                                              <Textarea
                                                value={step.description || ''}
                                                onChange={(e) => updateStepInEditing(step.id, 'description', e.target.value)}
                                                placeholder="How this step fits in this journey..."
                                                rows={4}
                                                className="text-sm resize-none"
                                              />
                                              <p className="text-xs text-slate-500">Optional context for this journey</p>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    {currentJourney.steps.length > 1 && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeStepFromEditing(step.id)}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0"
                                      >
                                        <X className="size-4" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                                {index < currentJourney.steps.length - 1 && (
                                  <div className="flex justify-center my-2">
                                    <ArrowRight className="size-5 text-slate-400 rotate-90" />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                            </div>

                            {/* Right Panel - Live Preview */}
                            <div className="w-[350px] bg-slate-50 p-6">
                              <div className="space-y-4">
                                <div className="flex items-center gap-2 mb-4">
                                  <Eye className="size-4 text-slate-600" />
                                  <h3 className="text-sm font-semibold text-slate-900">Live Preview</h3>
                                </div>

                                {/* Journey Preview Card */}
                                <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-4">
                                  {/* Journey Name */}
                                  <div>
                                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Journey Name</div>
                                    <div className="text-base font-medium text-slate-900">
                                      {currentJourney.name && currentJourney.name.trim() !== '' ? currentJourney.name : <span className="italic text-slate-400">Untitled Journey</span>}
                                    </div>
                                  </div>

                                  {/* Status and Frequency */}
                                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                                    <div>
                                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Status</div>
                                      <div>
                                        {currentJourney.status === 'pending' && (
                                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-100 text-amber-800 text-xs font-medium">
                                            <Clock className="size-3" /> Pending
                                          </span>
                                        )}
                                        {currentJourney.status === 'active' && (
                                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-100 text-green-800 text-xs font-medium">
                                            <CheckCircle className="size-3" /> Active
                                          </span>
                                        )}
                                        {currentJourney.status === 'inactive' && (
                                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 text-slate-700 text-xs font-medium">
                                            <XCircle className="size-3" /> Inactive
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Frequency</div>
                                      <div className="text-xs text-slate-700 capitalize">
                                        {currentJourney.collectionFrequency || 'Monthly'}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Journey Flow */}
                                  <div className="pt-3 border-t border-slate-100">
                                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                                      Journey Flow ({currentJourney.steps.length} Steps)
                                    </div>
                                    {currentJourney.steps.length === 0 ? (
                                      <p className="text-xs text-slate-400 italic text-center py-4">No steps added yet</p>
                                    ) : (
                                      <div className="space-y-1">
                                        {currentJourney.steps.map((step, idx) => (
                                          <div key={step.id} className="flex items-center gap-2 text-xs">
                                            <span className="flex items-center justify-center size-5 rounded-full bg-[#ff6900] text-white font-semibold text-[10px]">
                                              {step.stepNumber}
                                            </span>
                                            <span className="text-slate-700 font-medium">{step.name || `Step ${step.stepNumber}`}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Actions - Bottom Bar */}
                          <div className="flex gap-2 justify-end border-t border-slate-200 p-6 bg-white">
                            <Button variant="outline" onClick={cancelEditing}>
                              Cancel
                            </Button>
                            <Button 
                              onClick={saveJourney}
                              disabled={!currentJourney.name || currentJourney.name.trim() === '' || currentJourney.steps.length === 0}
                              style={{ backgroundColor: '#ff6900' }}
                              className="text-white hover:opacity-90 disabled:opacity-50"
                            >
                              Save Changes
                            </Button>
                          </div>
                        </Card>
                      ) : (
                        <div className="space-y-4">
                          {/* View Mode */}
                          {journey.description && (
                            <div>
                              <h4 className="font-semibold text-slate-900 mb-2">Description</h4>
                              <p className="text-slate-700">{journey.description}</p>
                            </div>
                          )}

                          <div>
                            <h4 className="font-semibold text-slate-900 mb-3">Journey Steps ({journey.steps.length})</h4>
                            <div className="space-y-3">
                              {journey.steps.map((step, index) => (
                                <div key={step.id}>
                                  <div className="bg-white border border-slate-200 rounded-lg p-4">
                                    <div className="flex items-start gap-3">
                                      <div className="flex items-center justify-center size-8 rounded-full bg-slate-200 text-slate-700 font-semibold shrink-0">
                                        {step.stepNumber}
                                      </div>
                                      <div className="flex-1">
                                        <div className="flex items-start justify-between gap-2 mb-1">
                                          <h5 className="font-semibold text-slate-900">{step.name}</h5>
                                          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded shrink-0">
                                            {step.appName}
                                          </span>
                                        </div>
                                        {step.description && (
                                          <p className="text-sm text-slate-600">{step.description}</p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  {index < journey.steps.length - 1 && (
                                    <div className="flex justify-center my-2">
                                      <ArrowRight className="size-5 text-slate-400 rotate-90" />
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t">
                            <div>
                              <div className="text-xs text-slate-500">Total Steps</div>
                              <div className="text-sm font-semibold text-slate-400">{journey.steps.length}</div>
                            </div>
                            <div>
                              <div className="text-xs text-slate-500">Unique Apps</div>
                              <div className="text-sm font-semibold text-slate-400">{uniqueApps.length}</div>
                            </div>
                            <div>
                              <div className="text-xs text-slate-500">Created</div>
                              <div className="text-sm font-semibold text-slate-400">{journey.createdAt}</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      </main>

      {/* Preview Modal */}
      {previewJourney && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl my-8">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-lg">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">Preview: {previewJourney.name}</h2>
                <p className="text-sm text-slate-600 mt-1">This is how the journey will appear in the Key Journeys view</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={closePreview}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="size-5" />
              </Button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Experience Journey Visualization */}
              <section>
                <div className="mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-slate-900 font-semibold">Experience Journey</h3>
                      <p className="text-sm text-slate-500 italic font-light mt-0.5">
                        Tracking {previewJourney.steps.filter(step => 
                          masterSteps.find(ms => ms.id === step.id)?.scoreCount
                        ).length} out of {previewJourney.steps.length} steps
                      </p>
                    </div>
                    {/* Status Badge */}
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                        previewJourney.status === 'active' 
                          ? 'bg-green-100 text-green-800'
                          : previewJourney.status === 'pending'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        <span className={`size-2 rounded-full ${
                          previewJourney.status === 'active' 
                            ? 'bg-green-600' 
                            : previewJourney.status === 'pending'
                            ? 'bg-blue-600'
                            : 'bg-slate-400'
                        }`} />
                        {previewJourney.status === 'active' ? (
                          <>
                            Collecting Data
                            <span className="text-slate-400 mx-0.5">·</span>
                            {previewJourney.collectionFrequency === 'weekly' ? 'Weekly' : 
                             previewJourney.collectionFrequency === 'bi-weekly' ? 'Bi-weekly' :
                             previewJourney.collectionFrequency === 'monthly' ? 'Monthly' :
                             previewJourney.collectionFrequency === 'quarterly' ? 'Quarterly' :
                             previewJourney.collectionFrequency === 'semi-annually' ? 'Semi-annually' :
                             previewJourney.collectionFrequency === 'annually' ? 'Annually' : 'Monthly'}
                          </>
                        ) : previewJourney.status === 'pending' ? (
                          <>
                            Pending
                            <span className="text-slate-400 mx-0.5">·</span>
                            Will collect {previewJourney.collectionFrequency === 'weekly' ? 'Weekly' : 
                             previewJourney.collectionFrequency === 'bi-weekly' ? 'Bi-weekly' :
                             previewJourney.collectionFrequency === 'monthly' ? 'Monthly' :
                             previewJourney.collectionFrequency === 'quarterly' ? 'Quarterly' :
                             previewJourney.collectionFrequency === 'semi-annually' ? 'Semi-annually' :
                             previewJourney.collectionFrequency === 'annually' ? 'Annually' : 'Monthly'}
                          </>
                        ) : (
                          <>Measured {previewJourney.measuredStartDate} – {previewJourney.measuredEndDate}</>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
                
                <Card className="p-6 border-slate-200">
                  {/* Layer 1: Overall Journey - Full width, no scroll */}
                  <div className="mb-6">
                    <div className="bg-orange-50 border border-orange-200 rounded-md px-6 py-3 flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <span className="text-slate-900 font-semibold block mb-1">{previewJourney.name}</span>
                        {previewJourney.description && (
                          <span className="text-slate-600 text-sm block">{previewJourney.description}</span>
                        )}
                      </div>
                      <div className="flex flex-col items-end flex-shrink-0">
                        <span className="text-xl font-semibold text-orange-600">
                          {Math.floor(55 + Math.random() * 20)}
                        </span>
                        <span className="text-xs font-medium text-green-700">
                          +5% MoM
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Layer 2 & 3: Steps and Apps - Scrollable with content peeking out on right */}
                  <div className="relative -mr-6 pr-6">
                    <div className="overflow-x-scroll pb-2">
                      <div className="min-w-max pr-20">
                      {/* Layer 2: Touchpoints/Steps */}
                      <div className="mb-3">
                        <div className="flex gap-3 justify-start px-4">
                        {(() => {
                          // Calculate individual step widths based on app spans
                          const stepWidths: number[] = [];
                          let currentIndex = 0;
                          
                          while (currentIndex < previewJourney.steps.length) {
                            const currentStep = previewJourney.steps[currentIndex];
                            
                            // Count consecutive steps with the same app
                            let spanCount = 1;
                            while (
                              currentIndex + spanCount < previewJourney.steps.length && 
                              previewJourney.steps[currentIndex + spanCount].appId === currentStep.appId
                            ) {
                              spanCount++;
                            }
                            
                            // Calculate total width for this app span
                            const baseWidth = spanCount * 120 + (spanCount - 1) * 12;
                            const appNameLength = currentStep.appName.length;
                            const extraWidth = appNameLength > 8 ? Math.min((appNameLength - 8) * 6, 40) : 0;
                            const totalWidth = baseWidth + extraWidth;
                            
                            // Calculate individual step width from total
                            const individualStepWidth = (totalWidth - (spanCount - 1) * 12) / spanCount;
                            
                            // Assign this width to all steps in this span
                            for (let i = 0; i < spanCount; i++) {
                              stepWidths[currentIndex + i] = individualStepWidth;
                            }
                            
                            currentIndex += spanCount;
                          }

                          return previewJourney.steps.map((step, index) => {
                            const mockScore = Math.floor(50 + Math.random() * 30);
                            const mockPrevScore = Math.floor(45 + Math.random() * 25);
                            const diff = mockScore - mockPrevScore;
                            const diffPercent = mockPrevScore > 0 ? ((diff / mockPrevScore) * 100).toFixed(0) : '0';
                            
                            return (
                              <div
                                key={step.id}
                                title={step.description}
                                style={{ width: `${stepWidths[index]}px` }}
                                className="bg-white border border-slate-300 rounded px-3 py-2 flex-shrink-0 cursor-default relative group"
                              >
                                <div className="flex flex-col items-center">
                                  <span className="text-slate-600 text-[10px] mb-1">Step {index + 1}</span>
                                  <span className="text-slate-900 font-medium text-[11px] mb-1 text-center leading-tight line-clamp-2">
                                    {step.name}
                                  </span>
                                  <span className={`text-lg font-semibold ${getScoreColor(mockScore)}`}>
                                    {mockScore}
                                  </span>
                                  <span className={`text-[10px] font-medium ${
                                    diff > 0 ? 'text-green-700' : diff < 0 ? 'text-red-700' : 'text-slate-500'
                                  }`}>
                                    {diff > 0 ? '+' : ''}{diffPercent}% MoM
                                  </span>
                                </div>
                                {/* Tooltip */}
                                {step.description && (
                                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-10 w-64">
                                    <div className="bg-slate-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg">
                                      <div className="font-semibold mb-1">Step {index + 1}: {step.name}</div>
                                      <div className="text-slate-300">{step.description}</div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>

                    {/* Layer 3: Apps */}
                    <div>
                      <div className="flex gap-3 justify-start px-4 relative">
                        {(() => {
                          const appSpans: JSX.Element[] = [];
                          let currentIndex = 0;
                          
                          while (currentIndex < previewJourney.steps.length) {
                            const currentStep = previewJourney.steps[currentIndex];
                            
                            // Count consecutive steps with the same app
                            let spanCount = 1;
                            while (
                              currentIndex + spanCount < previewJourney.steps.length && 
                              previewJourney.steps[currentIndex + spanCount].appId === currentStep.appId
                            ) {
                              spanCount++;
                            }
                            
                            // Calculate width with extra space for longer names
                            const baseWidth = spanCount * 120 + (spanCount - 1) * 12;
                            const appNameLength = currentStep.appName.length;
                            const extraWidth = appNameLength > 8 ? Math.min((appNameLength - 8) * 6, 40) : 0;
                            const width = baseWidth + extraWidth;
                            
                            const mockAppScore = Math.floor(50 + Math.random() * 30);
                            const mockPrevAppScore = Math.floor(45 + Math.random() * 25);
                            const appDiff = mockAppScore - mockPrevAppScore;
                            const appDiffPercent = mockPrevAppScore > 0 ? ((appDiff / mockPrevAppScore) * 100).toFixed(0) : '0';
                            
                            appSpans.push(
                              <div
                                key={`span-${currentIndex}`}
                                style={{ width: `${width}px` }}
                                className="bg-slate-50 border border-slate-300 rounded px-3 py-2 flex-shrink-0"
                              >
                                <div className="flex flex-col items-center">
                                  <span className="text-slate-900 font-semibold text-[11px] mb-1 text-center leading-tight max-w-full px-1">
                                    {currentStep.appName}
                                  </span>
                                  <span className={`text-sm font-semibold ${getScoreColor(mockAppScore)}`}>
                                    {mockAppScore}
                                  </span>
                                  <span className={`text-[10px] font-medium ${
                                    appDiff > 0 ? 'text-green-700' : appDiff < 0 ? 'text-red-700' : 'text-slate-500'
                                  }`}>
                                    {appDiff > 0 ? '+' : ''}{appDiffPercent}% MoM
                                  </span>
                                </div>
                              </div>
                            );
                            
                            currentIndex += spanCount;
                          }
                          
                          return appSpans;
                        })()}
                      </div>
                    </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </section>

              {/* Journey Score Trend */}
              <section>
                <div className="mb-4">
                  <h3 className="text-slate-900 font-semibold mb-1">Journey Score Trend</h3>
                  <p className="text-sm text-slate-600">
                    {previewTrendView === 'overall' 
                      ? 'Mock trend data showing how this journey\'s overall performance might evolve over time.'
                      : previewTrendView === 'by-app'
                      ? 'Mock trend data showing performance by individual apps within this journey.'
                      : 'Mock trend data showing performance by individual steps within this journey.'
                    }
                  </p>
                </div>

                <Card className="p-6 border-slate-200">
                  {/* View Toggle */}
                  <div className="mb-4 flex items-center gap-1 border border-slate-300 rounded-md p-1 w-fit">
                    <Button
                      size="sm"
                      variant={previewTrendView === 'overall' ? 'default' : 'ghost'}
                      onClick={() => setPreviewTrendView('overall')}
                      className={
                        previewTrendView === 'overall'
                          ? 'bg-orange-600 hover:bg-orange-700 text-white'
                          : 'hover:bg-slate-100'
                      }
                    >
                      Overall
                    </Button>
                    <Button
                      size="sm"
                      variant={previewTrendView === 'by-app' ? 'default' : 'ghost'}
                      onClick={() => setPreviewTrendView('by-app')}
                      className={
                        previewTrendView === 'by-app'
                          ? 'bg-orange-600 hover:bg-orange-700 text-white'
                          : 'hover:bg-slate-100'
                      }
                    >
                      By App
                    </Button>
                    <Button
                      size="sm"
                      variant={previewTrendView === 'by-step' ? 'default' : 'ghost'}
                      onClick={() => setPreviewTrendView('by-step')}
                      className={
                        previewTrendView === 'by-step'
                          ? 'bg-orange-600 hover:bg-orange-700 text-white'
                          : 'hover:bg-slate-100'
                      }
                    >
                      By Step
                    </Button>
                  </div>

                  {/* Chart */}
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={generatePreviewTrendData()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="period" stroke="#64748b" />
                      <YAxis domain={[0, 100]} stroke="#64748b" />
                      <Tooltip />
                      <Legend />
                      {/* Overall line - always shown in by-app and by-step views */}
                      {previewTrendView === 'overall' ? (
                        <Line 
                          type="monotone" 
                          dataKey="score" 
                          stroke="#ea580c" 
                          strokeWidth={2}
                          name="Journey Score" 
                          dot={{ fill: '#ea580c', r: 4 }}
                        />
                      ) : (
                        <Line 
                          type="monotone" 
                          dataKey="overall" 
                          stroke="#ea580c" 
                          strokeWidth={2}
                          name="Overall Journey" 
                          dot={{ fill: '#ea580c', r: 4 }}
                        />
                      )}
                      {/* Individual lines based on view */}
                      {getPreviewChartLines().map((line, index) => (
                        <Line 
                          key={line} 
                          type="monotone" 
                          dataKey={line} 
                          stroke={getPreviewLineColor(line, index)} 
                          strokeWidth={1.5} 
                          name={line}
                          dot={{ r: 3 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
              </section>

              {/* Journey Details Summary */}
              <section>
                <h3 className="text-slate-900 font-semibold mb-4">Journey Summary</h3>
                <Card className="p-4 border-slate-200">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-xs text-slate-500">Total Steps</div>
                      <div className="text-lg font-semibold text-slate-400">{previewJourney.steps.length}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Unique Apps</div>
                      <div className="text-lg font-semibold text-slate-400">
                        {new Set(previewJourney.steps.map(s => s.appId)).size}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Description</div>
                      <div className="text-sm text-slate-400">
                        {previewJourney.description || 'No description provided'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Status</div>
                      <div className="text-sm font-semibold text-orange-600">Preview Mode</div>
                    </div>
                  </div>
                </Card>
              </section>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end rounded-b-lg">
              <Button onClick={closePreview} style={{ backgroundColor: '#ff6900' }} className="text-white hover:opacity-90">
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}