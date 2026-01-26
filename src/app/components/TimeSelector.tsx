// Time period picker used across dashboard pages.
// Supports month/quarter/year formats with optional overrides for available periods.
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

export type TimeFormat = 'month' | 'quarter' | 'year';

export interface TimePeriodData {
  format: TimeFormat;
  period: string;
}

interface TimeSelectorProps {
  value: TimePeriodData;
  onChange: (value: TimePeriodData) => void;
  variant?: 'light' | 'dark';
  availablePeriods?: Partial<Record<TimeFormat, string[]>>;
}

// Default period lists when no external `availablePeriods` are supplied.
const monthPeriods = [
  'December 2025', 'November 2025', 'October 2025', 'September 2025', 'August 2025', 'July 2025',
  'June 2025', 'May 2025', 'April 2025', 'March 2025', 'February 2025', 'January 2025',
  'December 2024', 'November 2024', 'October 2024', 'September 2024', 'August 2024', 'July 2024',
  'June 2024', 'May 2024', 'April 2024', 'March 2024', 'February 2024', 'January 2024',
];

const quarterPeriods = [
  'Q4 2025', 'Q3 2025', 'Q2 2025', 'Q1 2025',
  'Q4 2024', 'Q3 2024', 'Q2 2024', 'Q1 2024',
  'Q4 2023', 'Q3 2023', 'Q2 2023', 'Q1 2023',
];

const yearPeriods = ['2025', '2024', '2023', '2022', '2021'];

export function TimeSelector({ value, onChange, variant = 'light', availablePeriods }: TimeSelectorProps) {
  const isDark = variant === 'dark';
  
  // Resolve the list of periods for a given format, preferring injected data.
  const getPeriodOptions = (format: TimeFormat): string[] => {
    if (availablePeriods?.[format]?.length) return availablePeriods[format] ?? [];
    if (format === 'month') return monthPeriods;
    if (format === 'quarter') return quarterPeriods;
    return yearPeriods;
  };

  // When switching formats, auto-select the first available period.
  const handleFormatChange = (newFormat: TimeFormat) => {
    const periods = getPeriodOptions(newFormat);
    // Default to the first period in the new format
    onChange({
      format: newFormat,
      period: periods[0],
    });
  };

  const handlePeriodChange = (newPeriod: string) => {
    onChange({
      format: value.format,
      period: newPeriod,
    });
  };

  const currentPeriods = getPeriodOptions(value.format);

  return (
    <div className="flex items-center gap-3">
      {/* Format Selector */}
      <div className="flex gap-1 border border-slate-300 rounded-md p-1" 
           style={isDark ? { borderColor: '#475569', backgroundColor: '#1e293b' } : {}}>
        <Button
          size="sm"
          variant={value.format === 'month' ? 'default' : 'ghost'}
          onClick={() => handleFormatChange('month')}
          className={`${
            value.format === 'month' 
              ? 'bg-orange-600 hover:bg-orange-700 text-white' 
              : isDark 
                ? 'text-white hover:bg-slate-700' 
                : 'hover:bg-slate-100'
          }`}
        >
          Month
        </Button>
        <Button
          size="sm"
          variant={value.format === 'quarter' ? 'default' : 'ghost'}
          onClick={() => handleFormatChange('quarter')}
          className={`${
            value.format === 'quarter' 
              ? 'bg-orange-600 hover:bg-orange-700 text-white' 
              : isDark 
                ? 'text-white hover:bg-slate-700' 
                : 'hover:bg-slate-100'
          }`}
        >
          Quarter
        </Button>
        <Button
          size="sm"
          variant={value.format === 'year' ? 'default' : 'ghost'}
          onClick={() => handleFormatChange('year')}
          className={`${
            value.format === 'year' 
              ? 'bg-orange-600 hover:bg-orange-700 text-white' 
              : isDark 
                ? 'text-white hover:bg-slate-700' 
                : 'hover:bg-slate-100'
          }`}
        >
          Year
        </Button>
      </div>

      {/* Period Selector */}
      <Select value={value.period} onValueChange={handlePeriodChange}>
        <SelectTrigger 
          className={`w-48 ${
            isDark 
              ? 'bg-slate-800 border-slate-700 text-white' 
              : 'bg-white border-slate-300'
          }`}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {currentPeriods.length === 0 && (
            <SelectItem value="no-periods" disabled>
              No periods available
            </SelectItem>
          )}
          {currentPeriods.map((period) => (
            <SelectItem key={period} value={period}>
              {period}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}