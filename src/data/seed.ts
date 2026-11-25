import { generateRoster } from '../engine/scheduler';
import {
  WORKING_RULE_PRESETS,
  type Allocation,
  type AppState,
  type Brand,
  type Employee,
  type Holiday,
  type Leave,
  type Pod,
  type Process,
  type Weekday,
  type WorkingRulePreset,
} from '../types';

export const DEFAULT_MONTH = '2026-12';

const PROCESS_DEFS: Array<[string, string, string]> = [
  ['CS', 'Customer Support', '#2563eb'],
  ['ACC', 'Abandoned Cart Conversion', '#7c3aed'],
  ['RET', 'Retention', '#0d9488'],
  ['NDR', 'Non-Delivery Report', '#ea580c'],
];

const EMPLOYEE_NAMES = [
  'Aarav Sharma', 'Priya Nair', 'Rohan Mehta', 'Sneha Iyer', 'Aditya Rao', 'Kavya Desai', 'Vikram Singh', 'Meera Joshi',
  'Arjun Kapoor', 'Divya Menon', 'Nikhil Verma', 'Ananya Rao', 'Siddharth Jain', 'Riya Bharadwaj', 'Karan Malhotra', 'Pooja Shetty',
  'Rahul Deshpande', 'Neha Gupta', 'Aman Sethi', 'Ishita Mukherjee', 'Varun Nair', 'Shruti Kulkarni', 'Deepak Yadav', 'Tanvi Shah',
  'Manish Agarwal', 'Ruchi Tiwari', 'Saurabh Bose', 'Anjali Rane', 'Gaurav Thakur', 'Nandini Pillai',
];

// 16 single-resource brands (80%) followed by 4 multi-employee brands.
const BRAND_NAMES = [
  'Aurora Lifestyle', 'Bloom & Co', 'Caliber Fitness', 'Driftwood Home', 'Ember Skincare',
  'Fable Foods', 'Grove Organics', 'Halo Electronics', 'Indigo Apparel', 'Juniper Pets',
  'Kite Media', 'Lumen Health', 'Maple Street', 'Nomad Trail', 'Orchid Beauty', 'Pixel Studios',
  'Urban Merge', 'Verve Fashion', 'Willow Goods', 'Xenon Motors',
];

const POD_DEFS: Array<[string, string, number]> = [
  ['Alpha', '#6366f1', 0],
  ['Bravo', '#0ea5e9', 8],
  ['Charlie', '#f59e0b', 16],
  ['Delta', '#10b981', 24],
];

const BRAND_COLORS = ['#3b82f6', '#8b5cf6', '#14b8a6', '#f97316', '#ec4899', '#0ea5e9', '#84cc16', '#eab308'];

function rule(preset: WorkingRulePreset, id: string) {
  return { id, label: WORKING_RULE_PRESETS[preset].label, workingDays: [...WORKING_RULE_PRESETS[preset].workingDays], worksOnHolidays: WORKING_RULE_PRESETS[preset].worksOnHolidays };
}

function ruleFor(index: number, processId: string, allocationId: string) {
  let preset: WorkingRulePreset;
  switch (processId) {
    case 'CS': preset = index % 3 === 0 ? 'ALLS_DAYS' : 'DAILY_NO_HOLIDAYS'; break;
    case 'ACC': preset = index % 4 === 0 ? 'DAILY_NO_HOLIDAYS' : 'MON_SAT'; break;
    case 'RET': preset = 'MON_FRI'; break;
    case 'NDR': preset = index % 2 === 0 ? 'DAILY_NO_HOLIDAYS' : 'MON_SAT'; break;
    default: preset = 'MON_SAT';
  }
  return rule(preset, allocationId);
}

export function createSeedState(): AppState {
  const processes: Process[] = PROCESS_DEFS.map(([code, name, color]) => ({ id: code, code, name, color }));

  const pods: Pod[] = POD_DEFS.map(([name, color, start], i) => ({
    id: `pod-${'abcd'[i]}`,
    name: `${name} Pod`,
    color,
    leadEmployeeId: `emp-${String(start + 1).padStart(2, '0')}`,
  }));

  const employees: Employee[] = EMPLOYEE_NAMES.map((name, i) => {
    const pod = POD_DEFS.find(([, , start]) => i >= start && i < start + 8)!;
    const podIndex = POD_DEFS.indexOf(pod);
    return {
      id: `emp-${String(i + 1).padStart(2, '0')}`,
      name,
      email: `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@datastraw.example`,
      podId: `pod-${'abcd'[podIndex]}`,
      preferredOffDays: [
        ((i + podIndex) % 7) as Weekday,
        ...(i % 5 === 0 ? [(((i + podIndex) % 7) + 3) % 7 as Weekday] : []),
      ],
      maxConsecutiveDays: i % 7 === 0 ? 5 : 6,
      skills: [
        processes[i % processes.length].id,
        ...(i % 3 === 0 ? [processes[(i + 2) % processes.length].id] : []),
      ],
      joiningDate: `2024-${String((i % 12) + 1).padStart(2, '0')}-15`,
    };
  });

  const brands: Brand[] = BRAND_NAMES.map((name, i) => ({
    id: `brand-${String(i + 1).padStart(2, '0')}`,
    name,
    code: `B${String(i + 1).padStart(2, '0')}`,
    color: BRAND_COLORS[i % BRAND_COLORS.length],
    category: i % 5 === 0 ? 'Marketplace' : i % 4 === 0 ? 'Retail' : 'D2C',
  }));

  const allocations: Allocation[] = [];
  const assignments = ['ACC', 'RET', 'NDR'];
  let allocationNo = 0;
  const add = (
    brandIndex: number,
    processId: string,
    employeeIds: string[],
    minCoverage: number,
    preset: WorkingRulePreset | null
  ) => {
    const id = `alloc-${String(++allocationNo).padStart(3, '0')}`;
    allocations.push({
      id,
      brandId: brands[brandIndex].id,
      processId,
      employeeIds,
      minCoverage: Math.min(minCoverage, employeeIds.length),
      rule: preset ? rule(preset, id) : ruleFor(brandIndex, processId, id),
    });
  };

  // 16 of 20 brands (80%): one employee handles every assigned process.
  for (let i = 0; i < 16; i++) {
    const employeeId = `emp-${String(i + 1).padStart(2, '0')}`;
    add(i, 'CS', [employeeId], 1, null);
    add(i, assignments[i % assignments.length], [employeeId], 1, null);
    if (i % 3 === 0) add(i, assignments[(i % assignments.length) + 1], [employeeId], 1, null);
  }

  // 4 brands with two or three core employees: separate processes, shared
  // processes, and two cross-trained specialists who work across brands.
  add(16, 'CS', ['emp-17'], 1, 'DAILY_NO_HOLIDAYS');
  add(16, 'ACC', ['emp-17', 'emp-18'], 2, 'MON_SAT');
  add(16, 'NDR', ['emp-19'], 1, 'ALLS_DAYS');

  add(17, 'CS', ['emp-20'], 1, 'DAILY_NO_HOLIDAYS');
  add(17, 'ACC', ['emp-21'], 1, 'MON_SAT');
  add(17, 'RET', ['emp-22'], 1, 'MON_FRI');
  add(17, 'NDR', ['emp-20', 'emp-21'], 1, 'DAILY_NO_HOLIDAYS');

  add(18, 'CS', ['emp-23', 'emp-24'], 2, 'ALLS_DAYS');
  add(18, 'ACC', ['emp-25'], 1, 'MON_SAT');
  add(18, 'NDR', ['emp-23', 'emp-29'], 1, 'DAILY_NO_HOLIDAYS');

  add(19, 'CS', ['emp-26'], 1, 'DAILY_NO_HOLIDAYS');
  add(19, 'ACC', ['emp-27'], 1, 'MON_SAT');
  add(19, 'RET', ['emp-28'], 1, 'MON_FRI');
  add(19, 'NDR', ['emp-27', 'emp-30'], 1, 'DAILY_NO_HOLIDAYS');

  add(16, 'RET', ['emp-29'], 1, 'MON_FRI');
  add(17, 'ACC', ['emp-30'], 1, 'MON_SAT');

  const holidays: Holiday[] = [
    { date: '2026-10-02', name: 'Gandhi Jayanti' },
    { date: '2026-11-08', name: 'Diwali' },
    { date: '2026-12-25', name: 'Christmas Day' },
    { date: '2027-01-01', name: "New Year's Day" },
    { date: '2027-01-26', name: 'Republic Day' },
  ];

  const leaves: Leave[] = [
    { id: 'leave-1', employeeId: 'emp-01', startDate: '2026-12-08', endDate: '2026-12-09', type: 'PLANNED', reason: 'Approved leave' },
    { id: 'leave-2', employeeId: 'emp-03', startDate: '2026-12-22', endDate: '2026-12-22', type: 'COMP_OFF', reason: 'Comp-off swap' },
    { id: 'leave-3', employeeId: 'emp-11', startDate: '2026-12-15', endDate: '2026-12-17', type: 'PLANNED', reason: 'Approved leave' },
    { id: 'leave-4', employeeId: 'emp-17', startDate: '2026-12-18', endDate: '2026-12-18', type: 'PLANNED', reason: 'Approved leave' },
    { id: 'leave-5', employeeId: 'emp-24', startDate: '2026-12-05', endDate: '2026-12-05', type: 'COMP_OFF', reason: 'Comp-off swap' },
    { id: 'leave-6', employeeId: 'emp-28', startDate: '2026-12-27', endDate: '2026-12-28', type: 'PLANNED', reason: 'Approved leave' },
  ];

  const state: AppState = {
    employees,
    brands,
    processes,
    pods,
    allocations,
    leaves,
    holidays,
    overrides: [],
    manualAssignments: [],
    roster: null,
    baselineRoster: null,
    baselineOverrides: [],
    rosterMonth: DEFAULT_MONTH,
  };

  // Generate synchronously so the first paint already shows a real roster
  // instead of a brief 0% / "no roster" state.
  return { ...state, roster: generateRoster({ ...state, month: DEFAULT_MONTH }) };
}
