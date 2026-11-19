// Human-readable labels for the API's option codes, the preset scenarios,
// and the what-if comparisons. Option codes not listed here fall back to a
// tidied version of the code itself, so a new API option never breaks the UI.
import type { CrashInput } from "./api";

export const FIELD_LABELS: Record<string, string> = {
  collision_type: "Type of collision",
  first_harmful_event: "What the vehicle hit first",
  body_type: "Vehicle type",
  make: "Make",
  model_year: "Model year",
  driver_age: "Driver age",
  driver_sex: "Driver sex",
  seatbelt: "Driver seatbelt",
  speed_limit_mph: "Posted speed limit",
  area: "Area",
  light: "Lighting",
  weather: "Weather",
  hour: "Time of day",
  day_of_week: "Day of week",
  month: "Month",
  vehicles_in_crash: "Vehicles in the crash",
  occupants: "People in this vehicle",
  intersection: "Intersection",
  road_location: "Where on the road",
  work_zone: "Work zone",
  electronic_stability_control: "Electronic stability control",
  automatic_emergency_braking: "Automatic emergency braking",
  blind_spot_warning: "Blind-spot warning",
  lane_departure_warning: "Lane-departure warning",
  backup_camera: "Backup camera",
  curtain_airbags: "Curtain airbags",
  crash_year: "Crash year",
};

const OPTION_LABELS: Record<string, Record<string, string>> = {
  collision_type: {
    front_to_rear: "Rear-end", angle: "Angle (T-bone)", front_to_front: "Head-on",
    sideswipe_same_direction: "Sideswipe, same direction",
    sideswipe_opposite_direction: "Sideswipe, opposite direction",
    rear_to_side: "Rear-to-side", rear_to_rear: "Rear-to-rear",
    not_with_moving_vehicle: "Not with another moving vehicle", other: "Other", unknown: "Unknown",
  },
  first_harmful_event: {
    motor_vehicle: "Another moving vehicle", pedestrian: "Pedestrian", cyclist: "Cyclist",
    animal: "Animal", parked_vehicle: "Parked vehicle", rollover: "Rolled over",
    ditch: "Ditch", tree: "Tree", pole: "Utility pole / light", curb: "Curb",
    guardrail: "Guardrail", concrete_barrier: "Concrete barrier", embankment: "Embankment",
    fence: "Fence", other_fixed_object: "Other fixed object", other_object: "Other object",
  },
  body_type: {
    sedan: "Sedan", suv: "SUV", large_suv: "Large SUV", crossover: "Crossover",
    pickup: "Pickup truck", minivan: "Minivan", hatchback: "Hatchback", coupe: "Coupe",
    convertible: "Convertible", wagon: "Wagon", van: "Van", cargo_van: "Cargo van",
    motorcycle: "Motorcycle", sport_motorcycle: "Sport motorcycle",
    cruiser_motorcycle: "Cruiser motorcycle", scooter: "Scooter", box_truck: "Box truck",
    semi_truck: "Semi truck", unknown: "Unknown",
  },
  seatbelt: {
    lap_and_shoulder: "Lap and shoulder belt", lap_only: "Lap belt only",
    shoulder_only: "Shoulder belt only", none: "No seatbelt", unknown: "Unknown",
  },
  light: {
    daylight: "Daylight", dark_lighted: "Dark, street lights", dark_not_lighted: "Dark, no street lights",
    dusk: "Dusk", dawn: "Dawn", unknown: "Unknown",
  },
  weather: {
    clear: "Clear", cloudy: "Cloudy", rain: "Rain", snow: "Snow", sleet_or_hail: "Sleet or hail",
    freezing_rain: "Freezing rain", fog: "Fog or smoke", blowing_snow: "Blowing snow",
    crosswinds: "Severe crosswinds", blowing_sand: "Blowing sand or dirt", other: "Other", unknown: "Unknown",
  },
  intersection: {
    not_intersection: "Not at an intersection", four_way: "Four-way", t_intersection: "T-intersection",
    y_intersection: "Y-intersection", l_intersection: "L-intersection", five_point: "Five or more roads",
    roundabout: "Roundabout", traffic_circle: "Traffic circle", other: "Other", unknown: "Unknown",
  },
  road_location: {
    on_roadway: "On the road", roadside: "Roadside", shoulder: "Shoulder", median: "Median",
    parking_lane: "Parking lane", turn_lane: "Center turn lane", outside_trafficway: "Off the road",
    unknown: "Unknown",
  },
  work_zone: {
    none: "None", construction: "Construction", maintenance: "Maintenance", utility: "Utility work",
    unknown_type: "Work zone, type unknown",
  },
  curtain_airbags: {
    all_rows: "All rows", first_and_second_rows: "Front and second rows",
    first_row: "Front row only", three_rows: "Three rows", unknown: "Unknown",
  },
};

const FEATURE_LABELS = { yes: "Standard", optional: "Optional", no: "Not equipped", unknown: "Unknown" };
for (const f of ["electronic_stability_control", "automatic_emergency_braking", "blind_spot_warning",
  "lane_departure_warning", "backup_camera"]) OPTION_LABELS[f] = FEATURE_LABELS;

export function optionLabel(field: string, code: string): string {
  return OPTION_LABELS[field]?.[code] ?? code.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export const MONTHS = ["January", "February", "March", "April", "May", "June", "July",
  "August", "September", "October", "November", "December"];

export function hourLabel(h: number): string {
  const suffix = h < 12 ? "am" : "pm";
  const twelve = h % 12 === 0 ? 12 : h % 12;
  return `${twelve}:00 ${suffix}`;
}

export const SPEED_LIMITS = Array.from({ length: 16 }, (_, i) => (i + 1) * 5);

// ---------------------------------------------------------------------------
// Preset scenarios
// ---------------------------------------------------------------------------
export const PRESETS: { name: string; values: CrashInput }[] = [
  {
    name: "Late-night rural head-on",
    values: { collision_type: "front_to_front", body_type: "sedan", make: "Toyota", model_year: 2012,
      driver_age: 70, seatbelt: "lap_and_shoulder", speed_limit_mph: 55, area: "rural",
      light: "dark_not_lighted", weather: "clear", hour: 22 },
  },
  {
    name: "Daytime city rear-end",
    values: { collision_type: "front_to_rear", body_type: "suv", make: "Honda", model_year: 2020,
      driver_age: 35, seatbelt: "lap_and_shoulder", speed_limit_mph: 35, area: "urban",
      light: "daylight", weather: "clear", hour: 17 },
  },
  {
    name: "Motorcycle on a highway",
    values: { collision_type: "not_with_moving_vehicle", first_harmful_event: "guardrail",
      body_type: "sport_motorcycle", make: "Harley Davidson", model_year: 2016, driver_age: 28,
      seatbelt: "none", speed_limit_mph: 65, area: "rural", light: "daylight", weather: "clear",
      hour: 15, vehicles_in_crash: 1 },
  },
  {
    name: "Teen driver hits a tree",
    values: { collision_type: "not_with_moving_vehicle", first_harmful_event: "tree", body_type: "sedan",
      make: "Honda", model_year: 2008, driver_age: 17, seatbelt: "none", speed_limit_mph: 45,
      area: "rural", light: "dark_not_lighted", weather: "rain", hour: 23, vehicles_in_crash: 1 },
  },
];

// ---------------------------------------------------------------------------
// What-if comparisons: the same crash with one detail changed
// ---------------------------------------------------------------------------
export type WhatIf = { label: string; change: CrashInput };

export function whatIfs(input: CrashInput): WhatIf[] {
  const out: WhatIf[] = [];

  out.push(input.seatbelt === "lap_and_shoulder"
    ? { label: "With no seatbelt", change: { seatbelt: "none" } }
    : { label: "With a lap and shoulder belt", change: { seatbelt: "lap_and_shoulder" } });

  const limit = typeof input.speed_limit_mph === "number" ? input.speed_limit_mph : null;
  out.push(limit !== null && limit >= 45
    ? { label: "On a 35 mph road", change: { speed_limit_mph: 35 } }
    : { label: "On a 55 mph road", change: { speed_limit_mph: 55 } });

  out.push(input.light === "daylight"
    ? { label: "At night, no street lights", change: { light: "dark_not_lighted" } }
    : { label: "In daylight", change: { light: "daylight" } });

  out.push(input.area === "rural"
    ? { label: "In an urban area", change: { area: "urban" } }
    : { label: "In a rural area", change: { area: "rural" } });

  return out;
}
